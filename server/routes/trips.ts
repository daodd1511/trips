import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { z } from "zod";
import { tripInput, tripPatch } from "../../shared/schemas.ts";
import { idParam, jsonBody } from "../http.ts";
import { createTrip, deleteTrip, getActiveTrip, getTripSummary, listTrips, setActiveTrip, updateTrip } from "../repo/trips.ts";

const activeTripInput = z.object({ tripId: z.number().int().positive() });

export function tripRoutes(db: Database) {
  return new Hono()
    .get("/trips", (c) => c.json(listTrips(db)))
    .post("/trips", jsonBody(tripInput), (c) => {
      const trip = createTrip(db, c.req.valid("json"));
      return c.json(getTripSummary(db, trip.id), 201);
    })
    .patch("/trips/:id", idParam, jsonBody(tripPatch), (c) => {
      const { id } = c.req.valid("param");
      updateTrip(db, id, c.req.valid("json"));
      return c.json(getTripSummary(db, id));
    })
    .delete("/trips/:id", idParam, (c) => {
      deleteTrip(db, c.req.valid("param").id);
      return c.json({ ok: true as const });
    })
    .get("/active-trip", (c) => c.json({ trip: getActiveTrip(db) }))
    .put("/active-trip", jsonBody(activeTripInput), (c) => c.json({ trip: setActiveTrip(db, c.req.valid("json").tripId) }));
}
