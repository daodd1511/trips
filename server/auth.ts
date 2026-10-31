import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/bun";
import { getCookie } from "hono/cookie";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Signing key for session tokens. Changing the password invalidates every session. */
export function sessionSecret(password: string): string {
  return createHmac("sha256", password).update("trips-session-v1").digest("base64url");
}

function signature(expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(String(expiresAt)).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Session token `<expiresAt>.<signature>`, with `expiresAt` in epoch milliseconds. */
export function signSession(expiresAt: number, secret: string): string {
  return `${expiresAt}.${signature(expiresAt, secret)}`;
}

/** True when the token carries a valid signature and has not expired at `now`. */
export function verifySession(token: string, secret: string, now: number): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  return safeEqual(token.slice(dot + 1), signature(expiresAt, secret));
}

/** Constant-time password comparison. */
export function passwordMatches(given: string, expected: string): boolean {
  return safeEqual(given, expected);
}

/** Rejects `/api` requests without a valid session cookie with 401. */
export function requireAuth(secret: string, now: () => number): MiddlewareHandler {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !verifySession(token, secret, now())) {
      return c.json({ error: "Sign in first" }, 401);
    }
    await next();
  };
}

/** Client IP: the Cloudflare tunnel header, then the socket address. */
export function clientIp(c: Context): string {
  const forwarded = c.req.header("CF-Connecting-IP");
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export type LoginLimiter = {
  /** Failed attempts left for `ip`, and milliseconds until it may try again when 0. */
  status(ip: string, now: number): { remaining: number; retryAfterMs: number };
  recordFailure(ip: string, now: number): void;
  reset(ip: string): void;
};

/** Allows `max` failed logins per IP within a sliding `windowMs`. */
export function createLoginLimiter(max = 5, windowMs = 60_000): LoginLimiter {
  const failures = new Map<string, number[]>();

  const recent = (ip: string, now: number): number[] => {
    const kept = (failures.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (kept.length) failures.set(ip, kept);
    else failures.delete(ip);
    return kept;
  };

  return {
    status(ip, now) {
      const times = recent(ip, now);
      const remaining = Math.max(0, max - times.length);
      const oldest = times[0];
      const retryAfterMs = remaining === 0 && oldest !== undefined ? oldest + windowMs - now : 0;
      return { remaining, retryAfterMs };
    },
    recordFailure(ip, now) {
      if (failures.size > 1000) for (const key of [...failures.keys()]) recent(key, now);
      failures.set(ip, [...recent(ip, now), now]);
    },
    reset(ip) {
      failures.delete(ip);
    },
  };
}
