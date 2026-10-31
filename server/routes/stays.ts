import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { stayInput, stayPatch } from "../../shared/schemas.ts";
import { idParam, jsonBody } from "../http.ts";
import { createStay, deleteStay, listStays, updateStay } from "../repo/stays.ts";

export function stayRoutes(db: Database) {
  return new Hono()
    .get("/trips/:id/stays", idParam, (c) => c.json(listStays(db, c.req.valid("param").id)))
    .post("/trips/:id/stays", idParam, jsonBody(stayInput), (c) =>
      c.json(createStay(db, c.req.valid("param").id, c.req.valid("json")), 201),
    )
    .patch("/stays/:id", idParam, jsonBody(stayPatch), (c) =>
      c.json(updateStay(db, c.req.valid("param").id, c.req.valid("json"))),
    )
    .delete("/stays/:id", idParam, (c) => {
      deleteStay(db, c.req.valid("param").id);
      return c.json({ ok: true as const });
    });
}
