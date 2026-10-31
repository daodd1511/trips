import { join } from "node:path";
import { mkdirSync } from "node:fs";
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

const app = createApp({ db, password });
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", async (c, next) => {
  if (c.req.path.startsWith("/api/")) return next();
  return serveStatic({ path: "./dist/index.html" })(c, next);
});

console.log(`trips listening on :${port}`);

export default { port, fetch: app.fetch };
