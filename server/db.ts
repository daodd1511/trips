import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dir, "migrations");

/** Opens the SQLite file at `path` (`:memory:` for tests) with foreign keys and WAL on. */
export function openDb(path: string): Database {
  const db = new Database(path, { create: true, strict: true });
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

/**
 * Applies every `server/migrations/*.sql` file not yet recorded in `schema_migrations`,
 * in filename order, each in its own transaction. Safe to call on every start.
 */
export function migrate(db: Database, dir: string = MIGRATIONS_DIR): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (" +
      "name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))",
  );
  const applied = new Set(
    db.query<{ name: string }, []>("SELECT name FROM schema_migrations").all().map((r) => r.name),
  );
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.query("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
    })();
  }
}

/** Key for case-insensitive category name matching, with full Unicode case folding. */
export function categoryKey(name: string): string {
  return name.trim().toLowerCase();
}
