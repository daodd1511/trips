import { expect, test } from "bun:test";
import type { TripSummary } from "../../shared/schemas.ts";
import { MAPS, testApp } from "../test-app.ts";

test("the first trip becomes active; later ones do not", async () => {
  const { call } = await testApp();
  const first = await call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" });
  expect(first.status).toBe(201);
  expect(first.body.theme).toBe("pine-berry");
  await call("POST", "/api/trips", { name: "Bangkok", currency: "THB", theme: "ink-chili" });
  const active = await call<{ trip: TripSummary }>("GET", "/api/active-trip");
  expect(active.body.trip?.name).toBe("Đà Lạt");
});

test("currency is locked once the trip has expenses; other fields still change", async () => {
  const { call } = await testApp();
  const trip = (await call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  expect((await call("PATCH", `/api/trips/${trip.id}`, { currency: "USD" })).status).toBe(200);
  await call("POST", `/api/trips/${trip.id}/expenses`, { name: "Bánh mì", amount: 30000, spentOn: "2026-11-19" });
  const locked = await call<{ error: string }>("PATCH", `/api/trips/${trip.id}`, { currency: "VND" });
  expect(locked.status).toBe(409);
  const renamed = await call<TripSummary>("PATCH", `/api/trips/${trip.id}`, { name: "Dalat", theme: "lantern" });
  expect(renamed.body).toMatchObject({ name: "Dalat", theme: "lantern", currency: "USD" });
});

test("an unknown theme is rejected", async () => {
  const { call } = await testApp();
  expect((await call("POST", "/api/trips", { name: "x", currency: "VND", theme: "neon" })).status).toBe(400);
});

test("summary carries counts, total spent, and dates from stays", async () => {
  const { call } = await testApp();
  const trip = (await call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  await call("POST", `/api/trips/${trip.id}/places`, { name: "Kem bơ", mapsUrl: MAPS });
  await call("POST", `/api/trips/${trip.id}/stays`, { name: "A", checkIn: "2026-11-18", checkOut: "2026-11-21" });
  await call("POST", `/api/trips/${trip.id}/stays`, { name: "B", checkIn: "2026-11-21", checkOut: "2026-11-22" });
  await call("POST", `/api/trips/${trip.id}/expenses`, { name: "Taxi", amount: 250000, spentOn: "2026-11-18" });
  const list = await call<TripSummary[]>("GET", "/api/trips");
  expect(list.body[0]).toMatchObject({ placeCount: 1, wantCount: 1, spent: 250000, startDate: "2026-11-18", endDate: "2026-11-22" });
});

test("deleting the active trip cascades and clears it", async () => {
  const { call, db } = await testApp();
  const trip = (await call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  await call("POST", `/api/trips/${trip.id}/places`, { name: "Kem bơ", mapsUrl: MAPS });
  await call("POST", `/api/trips/${trip.id}/stays`, { name: "A" });
  await call("POST", `/api/trips/${trip.id}/expenses`, { name: "Taxi", amount: 1, spentOn: "2026-11-18" });
  expect((await call("DELETE", `/api/trips/${trip.id}`)).status).toBe(200);
  expect((await call<{ trip: null }>("GET", "/api/active-trip")).body.trip).toBeNull();
  for (const t of ["places", "stays", "expenses"]) {
    expect((db.query(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n).toBe(0);
  }
  expect((await call("DELETE", `/api/trips/${trip.id}`)).status).toBe(404);
});

test("setting an unknown active trip is 404", async () => {
  const { call } = await testApp();
  expect((await call("PUT", "/api/active-trip", { tripId: 99 })).status).toBe(404);
});
