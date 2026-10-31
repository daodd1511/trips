import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { PLACE_STATUSES, placeInput, placePatch } from "../../shared/schemas.ts";
import { idParam, jsonBody } from "../http.ts";
import { createPlace, deletePlace, listPlaces, updatePlace } from "../repo/places.ts";

const listQuery = z.object({
  status: z.enum(PLACE_STATUSES).optional(),
  /** Comma-separated category ids. */
  categories: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .transform((s) => s.split(",").map(Number))
    .optional(),
  q: z.string().max(200).optional(),
});

export function placeRoutes(db: Database) {
  return new Hono()
    .get(
      "/trips/:id/places",
      idParam,
      validator("query", (value, c) => {
        const parsed = listQuery.safeParse(value);
        return parsed.success ? parsed.data : c.json({ error: "Invalid filter" }, 400);
      }),
      (c) => {
        const { status, categories, q } = c.req.valid("query");
        return c.json(listPlaces(db, c.req.valid("param").id, { status, categoryIds: categories, q }));
      },
    )
    .post("/trips/:id/places", idParam, jsonBody(placeInput), (c) =>
      c.json(createPlace(db, c.req.valid("param").id, c.req.valid("json")), 201),
    )
    .patch("/places/:id", idParam, jsonBody(placePatch), (c) =>
      c.json(updatePlace(db, c.req.valid("param").id, c.req.valid("json"))),
    )
    .delete("/places/:id", idParam, (c) => {
      deletePlace(db, c.req.valid("param").id);
      return c.json({ ok: true as const });
    });
}
