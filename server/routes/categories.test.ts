import { expect, test } from "bun:test";
import type { CategoryView, TripSummary } from "../../shared/schemas.ts";
import type { PlaceSaveResult } from "../repo/places.ts";
import { MAPS, testApp } from "../test-app.ts";

test("Other cannot be renamed or deleted", async () => {
  const { call, category } = await testApp();
  const other = category("Other");
  expect((await call("PATCH", `/api/categories/${other}`, { name: "Misc" })).status).toBe(403);
  expect((await call("DELETE", `/api/categories/${other}`)).status).toBe(403);
});

test("names are unique ignoring case and Unicode form", async () => {
  const { call } = await testApp();
  expect((await call("POST", "/api/categories", { name: "Cà phê" })).status).toBe(201);
  expect((await call("POST", "/api/categories", { name: "CÀ PHÊ".normalize("NFD") })).status).toBe(409);
  expect((await call("POST", "/api/categories", { name: "breakfast" })).status).toBe(409);
});

test("deleting a category reassigns only places left without one", async () => {
  const { call, category, db } = await testApp();
  const trip = (await call<TripSummary>("POST", "/api/trips", { name: "Đà Lạt", currency: "VND" })).body;
  const snack = category("Snack / street food");
  const dessert = category("Dessert");
  const add = async (name: string, categoryIds: number[]) =>
    (await call<PlaceSaveResult>("POST", `/api/trips/${trip.id}/places`, { name, mapsUrl: MAPS, categoryIds })).body.place;
  const onlySnack = await add("Bánh tráng", [snack]);
  const both = await add("Kem bơ", [snack, dessert]);

  const res = await call<{ removedFrom: number; movedToOther: number }>("DELETE", `/api/categories/${snack}`);
  expect(res.body).toEqual({ removedFrom: 2, movedToOther: 1 });

  const cats = (id: number) =>
    (db.query("SELECT category_id FROM place_categories WHERE place_id = ? ORDER BY category_id").all(id) as {
      category_id: number;
    }[]).map((r) => r.category_id);
  expect(cats(onlySnack.id)).toEqual([category("Other")]);
  expect(cats(both.id)).toEqual([dessert]);
});

test("counts are scoped to the requested trip", async () => {
  const { call, category } = await testApp();
  const a = (await call<TripSummary>("POST", "/api/trips", { name: "A", currency: "VND" })).body;
  const b = (await call<TripSummary>("POST", "/api/trips", { name: "B", currency: "VND" })).body;
  const dessert = category("Dessert");
  await call("POST", `/api/trips/${a.id}/places`, { name: "x", mapsUrl: MAPS, categoryIds: [dessert] });
  await call("POST", `/api/trips/${b.id}/places`, { name: "y", mapsUrl: MAPS, categoryIds: [dessert] });
  const scoped = (await call<CategoryView[]>("GET", `/api/categories?tripId=${a.id}`)).body;
  const all = (await call<CategoryView[]>("GET", "/api/categories")).body;
  expect(scoped.find((c) => c.id === dessert)?.placeCount).toBe(1);
  expect(all.find((c) => c.id === dessert)?.placeCount).toBe(2);
  expect(all.at(-1)?.name).toBe("Other");
});
