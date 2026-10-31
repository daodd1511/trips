import { expect, test } from "bun:test";
import type { Expense, ExpenseList, PlaceView, TripSummary } from "../../shared/schemas.ts";
import type { PlaceSaveResult } from "../repo/places.ts";
import { MAPS, testApp } from "../test-app.ts";

async function withPlace(status = "want") {
  const t = await testApp();
  const trip = (await t.call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  const place = (await t.call<PlaceSaveResult>("POST", `/api/trips/${trip.id}/places`, { name: "Kem bơ", mapsUrl: MAPS, status })).body.place;
  return { ...t, trip, place };
}

test("an expense from a place copies its name, uses today in the trip zone, and marks it visited", async () => {
  const { call, place } = await withPlace();
  const res = await call<{ expense: Expense; place: PlaceView }>("POST", `/api/places/${place.id}/expenses`, { price: "49k" });
  expect(res.status).toBe(201);
  expect(res.body.expense).toMatchObject({ name: "Kem bơ", amount: 49000, spentOn: "2026-11-19", placeId: place.id });
  expect(res.body.place).toMatchObject({ status: "visited", spent: 49000 });
});

test("a skipped place keeps its status", async () => {
  const { call, place } = await withPlace("skipped");
  const res = await call<{ place: PlaceView }>("POST", `/api/places/${place.id}/expenses`, { price: "30k" });
  expect(res.body.place.status).toBe("skipped");
});

test.each([["30.000"], ["abc"], ["0k"], ["1.0001k"]])("price %p is rejected and nothing changes", async (price) => {
  const { call, place, db } = await withPlace();
  const res = await call<{ error: string }>("POST", `/api/places/${place.id}/expenses`, { price });
  expect(res.status).toBe(400);
  expect((db.query("SELECT COUNT(*) AS n FROM expenses").get() as { n: number }).n).toBe(0);
  expect((db.query("SELECT status FROM places").get() as { status: string }).status).toBe("want");
});

test("totals per day add up to the grand total, newest first", async () => {
  const { call, trip } = await withPlace();
  const add = (name: string, amount: number, spentOn: string) =>
    call("POST", `/api/trips/${trip.id}/expenses`, { name, amount, spentOn });
  await add("Taxi", 250000, "2026-11-18");
  await add("Sữa", 60000, "2026-11-18");
  await add("Bánh mì", 30000, "2026-11-19");
  await add("Kem", 50000, "2026-11-19");
  const list = (await call<ExpenseList>("GET", `/api/trips/${trip.id}/expenses`)).body;
  expect(list.total).toBe(390000);
  expect(list.days).toEqual([
    { date: "2026-11-19", total: 80000, count: 2 },
    { date: "2026-11-18", total: 310000, count: 2 },
  ]);
  expect(list.items[0]?.spentOn).toBe("2026-11-19");
});

test("a free expense cannot link to a place in another trip", async () => {
  const { call, place } = await withPlace();
  const other = (await call<TripSummary>("POST", "/api/trips", { name: "B", currency: "VND" })).body;
  const res = await call("POST", `/api/trips/${other.id}/expenses`, { name: "x", amount: 1, spentOn: "2026-11-19", placeId: place.id });
  expect(res.status).toBe(400);
});

test("editing keeps the place link; invalid amounts are rejected", async () => {
  const { call, place } = await withPlace();
  const { expense } = (await call<{ expense: Expense }>("POST", `/api/places/${place.id}/expenses`, { price: "49k" })).body;
  const edited = await call<Expense>("PATCH", `/api/expenses/${expense.id}`, { amount: 50000 });
  expect(edited.body).toMatchObject({ amount: 50000, placeId: place.id, name: "Kem bơ" });
  expect((await call("PATCH", `/api/expenses/${expense.id}`, { amount: 1.5 })).status).toBe(400);
  expect((await call("PATCH", `/api/expenses/${expense.id}`, { amount: 0 })).status).toBe(400);
});

test("an expense patch keeps omitted fields", async () => {
  const { call, trip } = await withPlace();
  const e = (await call<Expense>("POST", `/api/trips/${trip.id}/expenses`, { name: "Taxi", amount: 250000, spentOn: "2026-11-18" })).body;
  const res = await call<Expense>("PATCH", `/api/expenses/${e.id}`, { name: "Taxi sân bay" });
  expect(res.body).toMatchObject({ name: "Taxi sân bay", amount: 250000, spentOn: "2026-11-18" });
});
