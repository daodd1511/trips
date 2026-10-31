import { expect, test } from "bun:test";
import type { ExportFile } from "../../shared/export.ts";
import type { Expense, PlaceView, TripSummary } from "../../shared/schemas.ts";
import type { PlaceSaveResult } from "./places.ts";
import { MAPS, testApp } from "../test-app.ts";

async function seeded() {
  const t = await testApp();
  const trip = (await t.call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND", theme: "lantern" })).body;
  const kem = (await t.call<PlaceSaveResult>("POST", `/api/trips/${trip.id}/places`, {
    name: "Kem bơ Thanh Thảo",
    mapsUrl: MAPS,
    sourceUrl: "https://www.tiktok.com/@x/video/1",
    notes: "sầu riêng",
    categoryIds: [t.category("Snack / street food"), t.category("Dessert")],
  })).body.place;
  await t.call("POST", `/api/trips/${trip.id}/places`, { name: "Chợ đêm", mapsUrl: MAPS });
  await t.call("POST", `/api/places/${kem.id}/expenses`, { price: "49k" });
  await t.call("PATCH", `/api/places/${kem.id}`, { rating: 8 });
  await t.call("POST", `/api/trips/${trip.id}/expenses`, { name: "Taxi", amount: 250000, spentOn: "2026-11-18" });
  await t.call("POST", `/api/trips/${trip.id}/stays`, { name: "Sương Mai", checkIn: "2026-11-18", checkOut: "2026-11-21", notes: "0358937727" });
  return { ...t, trip, kem };
}

const exportAll = async (call: Awaited<ReturnType<typeof testApp>>["call"]) =>
  (await call<ExportFile>("GET", "/api/export")).body;

test("export → import into an empty database reproduces the trip", async () => {
  const source = await seeded();
  const file = await exportAll(source.call);
  expect(file.version).toBe(1);

  const target = await testApp();
  const res = await target.call<{ trips: { id: number; name: string }[] }>("POST", "/api/import", file);
  expect(res.status).toBe(201);
  expect(res.body.trips.map((t) => t.name)).toEqual(["Đà Lạt"]);

  const again = await exportAll(target.call);
  expect(again.trips).toEqual(file.trips);

  const id = res.body.trips[0]?.id;
  const expenses = (await target.call<{ items: Expense[] }>("GET", `/api/trips/${id}/expenses`)).body.items;
  const places = (await target.call<PlaceView[]>("GET", `/api/trips/${id}/places`)).body;
  const kem = places.find((p) => p.name === "Kem bơ Thanh Thảo");
  expect(expenses.find((e) => e.name === "Kem bơ Thanh Thảo")?.placeId).toBe(kem?.id ?? -1);
  expect(kem).toMatchObject({ status: "visited", rating: 8, spent: 49000 });
});

test("a clashing trip name gets a dated suffix, then a counter", async () => {
  const t = await seeded();
  const file = await exportAll(t.call);
  const first = await t.call<{ trips: { name: string }[] }>("POST", "/api/import", file);
  const second = await t.call<{ trips: { name: string }[] }>("POST", "/api/import", file);
  expect(first.body.trips[0]?.name).toBe("Đà Lạt (imported 2026-11-19)");
  expect(second.body.trips[0]?.name).toBe("Đà Lạt (imported 2026-11-19) 2");
});

test("categories match ignoring case and Unicode form; missing ones are created; Other maps to the system row", async () => {
  const t = await testApp();
  const file: ExportFile = {
    version: 1,
    exportedAt: "2026-11-20T00:00:00.000Z",
    trips: [
      {
        name: "Hội An",
        currency: "VND",
        theme: "neon",
        places: [
          { ref: 1, name: "a", mapsUrl: MAPS, sourceUrl: null, notes: null, status: "want", rating: null, categories: ["BREAKFAST"] },
          { ref: 2, name: "b", mapsUrl: MAPS, sourceUrl: null, notes: null, status: "want", rating: null, categories: ["Cà phê".normalize("NFD"), "other"] },
          { ref: 3, name: "c", mapsUrl: MAPS, sourceUrl: null, notes: null, status: "want", rating: null, categories: [] },
        ],
        stays: [],
        expenses: [],
      },
    ],
  };
  const res = await t.call<{ trips: { id: number }[] }>("POST", "/api/import", file);
  expect(res.status).toBe(201);
  const id = res.body.trips[0]?.id;
  const trip = (await t.call<TripSummary[]>("GET", "/api/trips")).body.find((x) => x.id === id);
  expect(trip?.theme).toBe("pine-berry");

  const places = (await t.call<PlaceView[]>("GET", `/api/trips/${id}/places`)).body;
  const cats = (n: string) => places.find((p) => p.name === n)?.categoryIds;
  const created = t.db.query("SELECT id, name FROM categories WHERE name_key = ?").get("cà phê") as { id: number; name: string };
  expect(created.name).toBe("Cà phê");
  expect(cats("a")).toEqual([t.category("Breakfast")]);
  expect(cats("b")?.sort((x, y) => x - y)).toEqual([created.id, t.category("Other")].sort((x, y) => x - y));
  expect(cats("c")).toEqual([t.category("Other")]);
  const others = t.db.query("SELECT COUNT(*) AS n FROM categories WHERE name_key = 'other'").get() as { n: number };
  expect(others.n).toBe(1);
});

test.each([
  ["unknown version", { version: 2 }],
  ["a dangling place ref", { expenseRef: 9 }],
  ["a rating on an unvisited place", { rating: 5 }],
  ["a fractional amount", { amount: 1.5 }],
])("rejects %s and leaves the database unchanged", async (_label, change) => {
  const t = await seeded();
  const file = await exportAll(t.call);
  const bad: Omit<ExportFile, "version"> & { version: number } = structuredClone(file);
  const trip = bad.trips[0];
  if (!trip) throw new Error("fixture has no trip");
  if ("version" in change) bad.version = change.version;
  if ("expenseRef" in change && trip.expenses[0]) trip.expenses[0].placeRef = change.expenseRef;
  if ("rating" in change && trip.places[1]) trip.places[1].rating = change.rating;
  if ("amount" in change && trip.expenses[0]) trip.expenses[0].amount = change.amount;

  const counts = () =>
    ["trips", "places", "stays", "expenses", "categories"].map(
      (tbl) => (t.db.query(`SELECT COUNT(*) AS n FROM ${tbl}`).get() as { n: number }).n,
    );
  const before = counts();
  expect((await t.call("POST", "/api/import", bad)).status).toBe(400);
  expect(counts()).toEqual(before);
});

test("a failure midway through a valid file rolls back every trip", async () => {
  const t = await seeded();
  const file = await exportAll(t.call);
  const two: ExportFile = { ...file, trips: [...file.trips, { ...file.trips[0]!, name: "Second", currency: "VND" }] };
  t.db.exec("CREATE TRIGGER fail_second BEFORE INSERT ON trips WHEN NEW.name = 'Second' BEGIN SELECT RAISE(ABORT, 'boom'); END");
  const before = (t.db.query("SELECT COUNT(*) AS n FROM places").get() as { n: number }).n;
  expect((await t.call("POST", "/api/import", two)).status).toBe(500);
  expect((t.db.query("SELECT COUNT(*) AS n FROM places").get() as { n: number }).n).toBe(before);
  expect((t.db.query("SELECT COUNT(*) AS n FROM trips").get() as { n: number }).n).toBe(1);
});

test("trip export downloads as an attachment named after the trip", async () => {
  const t = await seeded();
  const res = await t.raw("GET", `/api/trips/${t.trip.id}/export`);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-disposition")).toBe('attachment; filename="trips-da-lat-2026-11-19.json"');
  const file = (await res.json()) as ExportFile;
  expect(file.trips).toHaveLength(1);
  expect((await t.raw("GET", "/api/trips/999/export")).status).toBe(404);
});

test("an import body over 5 MB is rejected", async () => {
  const t = await testApp();
  const res = await t.raw("POST", "/api/import", JSON.stringify({ pad: "x".repeat(5 * 1024 * 1024) }));
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "The file is larger than 5 MB" });
});
