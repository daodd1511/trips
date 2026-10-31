import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { categoryInput } from "../../shared/schemas.ts";
import { idParam, jsonBody } from "../http.ts";
import { createCategory, deleteCategory, listCategories, renameCategory } from "../repo/categories.ts";

export function categoryRoutes(db: Database) {
  return new Hono()
    .get(
      "/categories",
      validator("query", (value, c) => {
        const raw = value.tripId;
        if (raw === undefined) return { tripId: undefined };
        const tripId = Number(raw);
        return Number.isSafeInteger(tripId) && tripId > 0 ? { tripId } : c.json({ error: "Invalid trip" }, 400);
      }),
      (c) => c.json(listCategories(db, c.req.valid("query").tripId)),
    )
    .post("/categories", jsonBody(categoryInput), (c) => c.json(createCategory(db, c.req.valid("json").name), 201))
    .patch("/categories/:id", idParam, jsonBody(categoryInput), (c) =>
      c.json(renameCategory(db, c.req.valid("param").id, c.req.valid("json").name)),
    )
    .delete("/categories/:id", idParam, (c) => c.json(deleteCategory(db, c.req.valid("param").id)));
}
