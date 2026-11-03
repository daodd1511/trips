import { join } from "node:path";
import { mkdirSync } from "node:fs";
import type { Context } from "hono";
import { serveStatic } from "hono/bun";
import { createApp } from "./app.ts";
import { migrate, openDb } from "./db.ts";

const password = process.env.APP_PASSWORD;
if (!password) {
  console.error("APP_PASSWORD is required");
  process.exit(1);
}
const dataDir = process.env.DATA_DIR ?? "./data";
const port = Number(process.env.PORT ?? 3000);

mkdirSync(dataDir, { recursive: true });
const db = openDb(join(dataDir, "trips.db"));
migrate(db);

const app = createApp({ db, password, timeZone: process.env.TIME_ZONE ?? "Asia/Ho_Chi_Minh" });

// index.html must be revalidated on every load so a reload picks up a new deploy;
// files under assets/ carry a content hash in their name, so they never change.
const cacheHeaders = (path: string, c: Context): void => {
  c.header("Cache-Control", path.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
};
app.use("/*", serveStatic({ root: "./dist", onFound: cacheHeaders }));
app.get("*", async (c, next) => {
  if (c.req.path.startsWith("/api/")) return next();
  return serveStatic({ path: "./dist/index.html", onFound: cacheHeaders })(c, next);
});

const server = Bun.serve({ port, fetch: app.fetch });
console.log(`trips listening on :${port}`);

// The container runs this process as PID 1, which ignores signals without a handler.
// Without this, every deploy waits for Docker's timeout and kills the open database.
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  void server.stop().finally(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
