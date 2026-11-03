import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

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
 *
 * Foreign keys are off while a migration runs, so a migration can rebuild a table
 * without cascading deletes into its children; `foreign_key_check` must pass before the
 * migration commits. When an existing file database has pending migrations, a copy is
 * written next to it first: `<name>.before-<migration>.<timestamp>.db`.
 */
export function migrate(db: Database, dir: string = MIGRATIONS_DIR): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (" +
      "name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))",
  );
  const applied = new Set(
    db.query<{ name: string }, []>("SELECT name FROM schema_migrations").all().map((r) => r.name),
  );
  const pending = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !applied.has(f))
    .sort();
  if (pending.length === 0) return;
  if (applied.size > 0) backup(db, pending[0] ?? "migration");

  for (const file of pending) {
    const sql = readFileSync(join(dir, file), "utf8");
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.transaction(() => {
        db.exec(sql);
        const broken = db.query("PRAGMA foreign_key_check").all();
        if (broken.length > 0) {
          throw new Error(`Migration ${file} broke ${broken.length} foreign key reference(s)`);
        }
        db.query("INSERT INTO schema_migrations (name) VALUES (?)").run(file);
      })();
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }
}

/** Copies a file database next to itself before migrating; skips in-memory databases. */
function backup(db: Database, before: string): void {
  const path = db.filename;
  if (!path || path === ":memory:") return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(dirname(path), `${basename(path, ".db")}.before-${basename(before, ".sql")}.${stamp}.db`);
  db.query("VACUUM INTO ?").run(target);
}

/**
 * Key for case-insensitive category name matching: NFC-normalized and lowercased, so
 * decomposed input (common from macOS and iOS) matches its composed form.
 */
export function categoryKey(name: string): string {
  return name.trim().normalize("NFC").toLowerCase();
}
