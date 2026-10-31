import { describe, expect, test } from "bun:test";
import { createApp } from "./app.ts";
import { createLoginLimiter, sessionSecret, signSession, verifySession } from "./auth.ts";
import { migrate, openDb } from "./db.ts";

const secret = sessionSecret("secret");

describe("session tokens", () => {
  test("verify before expiry and fail after", () => {
    const token = signSession(2_000, secret);
    expect(verifySession(token, secret, 1_999)).toBe(true);
    expect(verifySession(token, secret, 2_000)).toBe(false);
  });

  test("fail with a different password", () => {
    const token = signSession(2_000, secret);
    expect(verifySession(token, sessionSecret("other"), 1_000)).toBe(false);
  });

  test("fail when the expiry is tampered", () => {
    const [, sig] = signSession(2_000, secret).split(".");
    expect(verifySession(`9999999.${sig}`, secret, 1_000)).toBe(false);
  });

  test.each([[""], ["abc"], [".sig"], ["12.34.56"], ["NaN.x"]])("reject malformed %p", (token) => {
    expect(verifySession(token, secret, 0)).toBe(false);
  });
});

describe("login limiter", () => {
  test("blocks after 5 failures and recovers after the window", () => {
    const limiter = createLoginLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) limiter.recordFailure("1.1.1.1", 1_000 + i);
    expect(limiter.status("1.1.1.1", 2_000).remaining).toBe(0);
    expect(limiter.status("1.1.1.1", 2_000).retryAfterMs).toBe(59_000);
    expect(limiter.status("2.2.2.2", 2_000).remaining).toBe(5);
    expect(limiter.status("1.1.1.1", 61_005).remaining).toBe(5);
  });
});

function setup() {
  const db = openDb(":memory:");
  migrate(db);
  let clock = 1_000_000;
  const app = createApp({ db, password: "secret", now: () => clock });
  const login = (password: string, ip = "9.9.9.9") =>
    app.request("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
      body: JSON.stringify({ password }),
    });
  return { app, login, advance: (ms: number) => (clock += ms) };
}

describe("login route", () => {
  test("sets a one-year HttpOnly session cookie on the right password", async () => {
    const { login } = setup();
    const res = await login("secret");
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=31536000");
  });

  test("counts down remaining tries, then returns 429", async () => {
    const { login } = setup();
    const first = await login("wrong");
    expect(first.status).toBe(401);
    expect(await first.json()).toMatchObject({ remaining: 4 });
    for (let i = 0; i < 4; i++) await login("wrong");
    const blocked = await login("secret");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("60");
  });

  test("protected routes need the cookie", async () => {
    const { app, login } = setup();
    expect((await app.request("/api/anything")).status).toBe(401);
    const cookie = (await login("secret")).headers.get("set-cookie")?.split(";")[0] ?? "";
    const res = await app.request("/api/session", { headers: { cookie } });
    expect(await res.json()).toEqual({ authenticated: true });
  });
});
