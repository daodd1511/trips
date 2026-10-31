import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { expenseInput, expensePatch, placeExpenseInput } from "../../shared/schemas.ts";
import { idParam, jsonBody } from "../http.ts";
import { addPlaceExpense, createExpense, deleteExpense, listExpenses, updateExpense } from "../repo/expenses.ts";

/** `today` returns the calendar date used when a place expense has no `spentOn`. */
export function expenseRoutes(db: Database, today: () => string) {
  return new Hono()
    .get("/trips/:id/expenses", idParam, (c) => c.json(listExpenses(db, c.req.valid("param").id)))
    .post("/trips/:id/expenses", idParam, jsonBody(expenseInput), (c) =>
      c.json(createExpense(db, c.req.valid("param").id, c.req.valid("json")), 201),
    )
    .post("/places/:id/expenses", idParam, jsonBody(placeExpenseInput), (c) => {
      const { price, spentOn } = c.req.valid("json");
      return c.json(addPlaceExpense(db, c.req.valid("param").id, price, spentOn ?? today()), 201);
    })
    .patch("/expenses/:id", idParam, jsonBody(expensePatch), (c) =>
      c.json(updateExpense(db, c.req.valid("param").id, c.req.valid("json"))),
    )
    .delete("/expenses/:id", idParam, (c) => {
      deleteExpense(db, c.req.valid("param").id);
      return c.json({ ok: true as const });
    });
}

