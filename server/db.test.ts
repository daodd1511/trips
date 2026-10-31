import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { categoryKey, migrate, openDb } from "./db.ts";

function fresh() {
  const db = openDb(":memory:");
  migrate(db);
  return db;
}

test("migrate is idempotent and seeds Other exactly once", () => {
  const db = fresh();
  migrate(db);
  const others = db.query("SELECT COUNT(*) AS n FROM categories WHERE is_system = 1").get() as { n: number };
  const applied = db.query("SELECT COUNT(*) AS n FROM schema_migrations").get() as { n: number };
  expect(others.n).toBe(1);
  expect(applied.n).toBe(1);
});

test("deleting a trip cascades and clears the active trip", () => {
  const db = fresh();
  db.exec("INSERT INTO trips (id, name, currency) VALUES (1, 'Đà Lạt', 'VND')");
  db.exec("INSERT INTO places (id, trip_id, name, maps_url) VALUES (1, 1, 'Kem bơ', 'https://maps.app.goo.gl/x')");
  db.exec("INSERT INTO place_categories (place_id, category_id) VALUES (1, 1)");
  db.exec("INSERT INTO stays (trip_id, name) VALUES (1, 'Homestay')");
  db.exec("INSERT INTO expenses (trip_id, place_id, name, amount, spent_on) VALUES (1, 1, 'Kem bơ', 49000, '2026-11-19')");
  db.exec("UPDATE settings SET active_trip_id = 1");

  db.exec("DELETE FROM trips WHERE id = 1");

  for (const table of ["places", "place_categories", "stays", "expenses"]) {
    expect((db.query(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n).toBe(0);
  }
  expect(db.query("SELECT active_trip_id FROM settings").get()).toEqual({ active_trip_id: null });
});

test("deleting a place keeps its expenses and unlinks them", () => {
  const db = fresh();
  db.exec("INSERT INTO trips (id, name, currency) VALUES (1, 'Đà Lạt', 'VND')");
  db.exec("INSERT INTO places (id, trip_id, name, maps_url) VALUES (1, 1, 'Kem bơ', 'https://maps.app.goo.gl/x')");
  db.exec("INSERT INTO expenses (trip_id, place_id, name, amount, spent_on) VALUES (1, 1, 'Kem bơ', 49000, '2026-11-19')");

  db.exec("DELETE FROM places WHERE id = 1");

  expect(db.query("SELECT place_id, name FROM expenses").get()).toEqual({ place_id: null, name: "Kem bơ" });
});

test("constraints reject a rating on a place that is not visited, and a zero amount", () => {
  const db = fresh();
  db.exec("INSERT INTO trips (id, name, currency) VALUES (1, 'Đà Lạt', 'VND')");
  expect(() =>
    db.exec("INSERT INTO places (trip_id, name, maps_url, status, rating) VALUES (1, 'x', 'u', 'want', 8)"),
  ).toThrow();
  expect(() =>
    db.exec("INSERT INTO expenses (trip_id, name, amount, spent_on) VALUES (1, 'x', 0, '2026-11-19')"),
  ).toThrow();
});

test("a failed migration rolls back and is not recorded", () => {
  const db = openDb(":memory:");
  const dir = mkdtempSync(join(tmpdir(), "trips-migrations-"));
  writeFileSync(`${dir}/001_bad.sql`, "CREATE TABLE ok (id INTEGER); INSERT INTO missing VALUES (1);");
  try {
    expect(() => migrate(db, dir)).toThrow();
    const tables = db.query("SELECT name FROM sqlite_master WHERE name = 'ok'").all();
    expect(tables).toEqual([]);
    expect(db.query("SELECT COUNT(*) AS n FROM schema_migrations").get()).toEqual({ n: 0 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("STRICT tables reject text and real values in integer columns", () => {
  const db = fresh();
  db.exec("INSERT INTO trips (id, name, currency) VALUES (1, 'Đà Lạt', 'VND')");
  for (const amount of ["'abc'", "0.5"]) {
    expect(() =>
      db.exec(`INSERT INTO expenses (trip_id, name, amount, spent_on) VALUES (1, 'x', ${amount}, '2026-11-19')`),
    ).toThrow();
  }
  expect(() =>
    db.exec("INSERT INTO places (trip_id, name, maps_url, status, rating) VALUES (1, 'x', 'u', 'visited', 7.5)"),
  ).toThrow();
});

test("categoryKey matches composed and decomposed Vietnamese", () => {
  expect(categoryKey("Cà phê")).toBe(categoryKey("Cà phê".normalize("NFD")));
  expect(categoryKey(" CÀ PHÊ ")).toBe(categoryKey("cà phê"));
});

test("seeds the default categories in order, with Other last and no Stay", () => {
  const names = (db: ReturnType<typeof fresh>) =>
    (db.query("SELECT name FROM categories ORDER BY id").all() as { name: string }[]).map((r) => r.name);
  expect(names(fresh())).toEqual([
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snack / street food",
    "Café / drinks",
    "Dessert",
    "Gift / souvenir",
    "Sightseeing",
    "Night market",
    "Other",
  ]);
});
