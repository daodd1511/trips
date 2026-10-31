import { expect, test } from "bun:test";
import type { PlaceView, TripSummary } from "../../shared/schemas.ts";
import type { PlaceSaveResult } from "../repo/places.ts";
import { MAPS, testApp } from "../test-app.ts";

async function withTrip() {
  const t = await testApp();
  const trip = (await t.call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  const add = (body: Record<string, unknown>) =>
    t.call<PlaceSaveResult>("POST", `/api/trips/${trip.id}/places`, { mapsUrl: MAPS, ...body });
  return { ...t, trip, add };
}

test("a place with no categories goes to Other", async () => {
  const { add, category } = await withTrip();
  const res = await add({ name: "Chợ đêm" });
  expect(res.status).toBe(201);
  expect(res.body.place.categoryIds).toEqual([category("Other")]);
});

test("unknown category ids are rejected and nothing is saved", async () => {
  const { add, db } = await withTrip();
  expect((await add({ name: "x", categoryIds: [999] })).status).toBe(400);
  expect((db.query("SELECT COUNT(*) AS n FROM places").get() as { n: number }).n).toBe(0);
});

test("rating is allowed only when visited and clears on leaving visited", async () => {
  const { add, call } = await withTrip();
  expect((await add({ name: "x", rating: 8 })).status).toBe(400);
  const place = (await add({ name: "Kem bơ", status: "visited", rating: 8 })).body.place;
  expect(place.rating).toBe(8);

  const renamed = await call<PlaceSaveResult>("PATCH", `/api/places/${place.id}`, { name: "Kem bơ Thanh Thảo" });
  expect(renamed.body.place).toMatchObject({ status: "visited", rating: 8 });

  const back = await call<PlaceSaveResult>("PATCH", `/api/places/${place.id}`, { status: "want" });
  expect(back.body.place).toMatchObject({ status: "want", rating: null });
  expect((await call("PATCH", `/api/places/${place.id}`, { rating: 5 })).status).toBe(400);
});

test("a patch without categoryIds keeps the categories", async () => {
  const { add, call, category } = await withTrip();
  const ids = [category("Snack / street food"), category("Dessert")].sort((a, b) => a - b);
  const place = (await add({ name: "Kem bơ", categoryIds: ids })).body.place;
  const res = await call<PlaceSaveResult>("PATCH", `/api/places/${place.id}`, { notes: "sầu riêng" });
  expect(res.body.place.categoryIds).toEqual(ids);
});

test("the same Maps link in the trip is flagged but saved", async () => {
  const { add } = await withTrip();
  const first = await add({ name: "Chợ đêm Đà Lạt" });
  expect(first.body.duplicateOf).toBeNull();
  const second = await add({ name: "Bánh tráng nướng" });
  expect(second.status).toBe(201);
  expect(second.body.duplicateOf).toEqual({ id: first.body.place.id, name: "Chợ đêm Đà Lạt" });
});

test("filters by status, categories (OR), and accent-insensitive search", async () => {
  const { add, call, trip, category } = await withTrip();
  const breakfast = category("Breakfast");
  const dessert = category("Dessert");
  await add({ name: "Bánh căn Nhà Chung", categoryIds: [breakfast], status: "visited" });
  await add({ name: "Kem bơ", categoryIds: [dessert], notes: "sầu riêng" });
  await add({ name: "Đồi chè Cầu Đất", categoryIds: [category("Sightseeing")] });

  const base = `/api/trips/${trip.id}/places`;
  const names = async (qs: string) => (await call<PlaceView[]>("GET", `${base}${qs}`)).body.map((p) => p.name).sort();
  expect(await names("?status=want")).toEqual(["Kem bơ", "Đồi chè Cầu Đất"]);
  expect(await names(`?categories=${breakfast},${dessert}`)).toEqual(["Bánh căn Nhà Chung", "Kem bơ"]);
  expect(await names("?q=banh%20can")).toEqual(["Bánh căn Nhà Chung"]);
  expect(await names("?q=doi%20che")).toEqual(["Đồi chè Cầu Đất"]);
  expect(await names("?q=sau%20rieng")).toEqual(["Kem bơ"]);
  expect((await call("GET", `${base}?status=gone`)).status).toBe(400);
});
