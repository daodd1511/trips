import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { validator } from "hono/validator";
import { z } from "zod";
import {
  type LoginLimiter,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clientIp,
  createLoginLimiter,
  passwordMatches,
  requireAuth,
  sessionSecret,
  signSession,
  verifySession,
} from "./auth.ts";
import { HttpError, todayIn } from "./http.ts";
import { categoryRoutes } from "./routes/categories.ts";
import { expenseRoutes } from "./routes/expenses.ts";
import { exportRoutes } from "./routes/export.ts";
import { placeRoutes } from "./routes/places.ts";
import { stayRoutes } from "./routes/stays.ts";
import { tripRoutes } from "./routes/trips.ts";

export type AppDeps = {
  db: Database;
  password: string;
  /** Clock in epoch milliseconds. */
  now?: () => number;
  limiter?: LoginLimiter;
  /** IANA zone for "today" when an expense has no date. */
  timeZone?: string;
};

const loginInput = z.object({ password: z.string().min(1).max(200) });

/**
 * Builds the HTTP app. `/api/*` requires a session except login, logout, and session,
 * which are registered before the authenticated sub-app and never reach its middleware.
 */
export function createApp({
  db,
  password,
  now = Date.now,
  limiter = createLoginLimiter(),
  timeZone = "Asia/Ho_Chi_Minh",
}: AppDeps) {
  const secret = sessionSecret(password);
  const today = () => todayIn(timeZone, now());

  // Hono copies a sub-app's routes when `.route()` is called, so every route must be
  // attached here before `api` is mounted below.
  const api = new Hono()
    .use(requireAuth(secret, now))
    .route("/", tripRoutes(db))
    .route("/", placeRoutes(db))
    .route("/", categoryRoutes(db))
    .route("/", stayRoutes(db))
    .route("/", expenseRoutes(db, today))
    .route("/", exportRoutes(db, now, today));

  return new Hono()
    .onError((err, c) => {
      if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
      if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
      console.error(err);
      return c.json({ error: "Something went wrong" }, 500);
    })
    .get("/health/ready", (c) => {
      try {
        db.query("SELECT 1").get();
        return c.json({ ok: true });
      } catch {
        return c.json({ ok: false }, 503);
      }
    })
    .post(
      "/api/login",
      validator("json", (value, c) => {
        const parsed = loginInput.safeParse(value);
        return parsed.success ? parsed.data : c.json({ error: "Enter the password" }, 400);
      }),
      (c) => {
        const ip = clientIp(c);
        const t = now();
        const { remaining, retryAfterMs } = limiter.status(ip, t);
        if (remaining === 0) {
          const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
          c.header("Retry-After", String(retryAfterSeconds));
          return c.json({ error: "Too many tries. Wait a minute, then try again.", retryAfterSeconds }, 429);
        }
        if (!passwordMatches(c.req.valid("json").password, password)) {
          limiter.recordFailure(ip, t);
          return c.json({ error: "Wrong password", remaining: remaining - 1 }, 401);
        }
        limiter.reset(ip);
        setCookie(c, SESSION_COOKIE, signSession(t + SESSION_TTL_MS, secret), {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
          maxAge: SESSION_TTL_MS / 1000,
        });
        return c.json({ ok: true });
      },
    )
    .post("/api/logout", (c) => {
      deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true });
      return c.json({ ok: true });
    })
    .get("/api/session", (c) => {
      const token = getCookie(c, SESSION_COOKIE);
      return c.json({ authenticated: !!token && verifySession(token, secret, now()) });
    })
    .route("/api", api);
}

export type AppType = ReturnType<typeof createApp>;
