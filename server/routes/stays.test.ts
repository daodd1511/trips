import { expect, test } from "bun:test";
import type { Stay, TripSummary } from "../../shared/schemas.ts";
import { testApp } from "../test-app.ts";

async function withTrip() {
  const t = await testApp();
  const trip = (await t.call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  return { ...t, trip };
}

test("check-out before check-in is rejected on create and on patch", async () => {
  const { call, trip } = await withTrip();
  const bad = await call("POST", `/api/trips/${trip.id}/stays`, { name: "A", checkIn: "2026-11-21", checkOut: "2026-11-20" });
  expect(bad.status).toBe(400);
  const stay = (await call<Stay>("POST", `/api/trips/${trip.id}/stays`, { name: "A", checkIn: "2026-11-21", checkOut: "2026-11-22" })).body;
  expect((await call("PATCH", `/api/stays/${stay.id}`, { checkOut: "2026-11-20" })).status).toBe(400);
});

test("stays sort by check-in, undated ones last", async () => {
  const { call, trip } = await withTrip();
  const add = (body: Record<string, unknown>) => call("POST", `/api/trips/${trip.id}/stays`, body);
  await add({ name: "Undated" });
  await add({ name: "Second", checkIn: "2026-11-21" });
  await add({ name: "First", checkIn: "2026-11-18" });
  const list = (await call<Stay[]>("GET", `/api/trips/${trip.id}/stays`)).body;
  expect(list.map((s) => s.name)).toEqual(["First", "Second", "Undated"]);
});

test("a stay patch keeps omitted fields", async () => {
  const { call, trip } = await withTrip();
  const stay = (await call<Stay>("POST", `/api/trips/${trip.id}/stays`, {
    name: "Sương Mai",
    mapsUrl: "https://maps.app.goo.gl/s",
    checkIn: "2026-11-18",
    checkOut: "2026-11-21",
    notes: "door 4471",
  })).body;
  const res = await call<Stay>("PATCH", `/api/stays/${stay.id}`, { name: "Sương Mai Homestay" });
  expect(res.body).toMatchObject({ mapsUrl: "https://maps.app.goo.gl/s", checkIn: "2026-11-18", checkOut: "2026-11-21", notes: "door 4471" });
});
