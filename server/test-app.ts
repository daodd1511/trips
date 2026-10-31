import { createApp } from "./app.ts";
import { migrate, openDb } from "./db.ts";

/** A migrated in-memory app with a signed-in `call` helper, for route tests. */
export async function testApp() {
  const db = openDb(":memory:");
  migrate(db);
  const app = createApp({ db, password: "secret", now: () => Date.UTC(2026, 10, 19, 3), timeZone: "Asia/Ho_Chi_Minh" });
  const login = await app.request("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "secret" }),
  });
  const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";

  async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
    const res = await app.request(path, {
      method,
      headers: { cookie, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as T };
  }

  const category = (name: string) =>
    (db.query("SELECT id FROM categories WHERE name = ?").get(name) as { id: number }).id;

  return { db, call, category };
}

export const MAPS = "https://maps.app.goo.gl/abc";
