import type { Database } from "bun:sqlite";
import { parsePrice } from "../../shared/price.ts";
import { expenseInput, type Expense, type ExpenseInput, type ExpenseList, type ExpensePatch, type PlaceView } from "../../shared/schemas.ts";
import { HttpError } from "../http.ts";
import { getPlace } from "./places.ts";
import { assertTrip } from "./trips.ts";

type ExpenseRow = {
  id: number;
  trip_id: number;
  place_id: number | null;
  name: string;
  amount: number;
  spent_on: string;
  created_at: string;
};

const toExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  tripId: r.trip_id,
  placeId: r.place_id,
  name: r.name,
  amount: r.amount,
  spentOn: r.spent_on,
  createdAt: r.created_at,
});

/** A trip's expenses, newest first, with the grand total and a total per date. */
export function listExpenses(db: Database, tripId: number): ExpenseList {
  assertTrip(db, tripId);
  const items = db
    .query<ExpenseRow, [number]>(
      "SELECT * FROM expenses WHERE trip_id = ? ORDER BY spent_on DESC, created_at DESC, id DESC",
    )
    .all(tripId)
    .map(toExpense);
  const days = db
    .query<{ date: string; total: number; count: number }, [number]>(
      `SELECT spent_on AS date, SUM(amount) AS total, COUNT(*) AS count
       FROM expenses WHERE trip_id = ? GROUP BY spent_on ORDER BY spent_on DESC`,
    )
    .all(tripId);
  const total = days.reduce((sum, d) => sum + d.total, 0);
  return { items, total, days };
}

function getExpense(db: Database, id: number): Expense {
  const row = db.query<ExpenseRow, [number]>("SELECT * FROM expenses WHERE id = ?").get(id);
  if (!row) throw new HttpError(404, "Expense not found");
  return toExpense(row);
}

/** Adds a free expense, or one linked to a place in the same trip. */
export function createExpense(db: Database, tripId: number, input: ExpenseInput): Expense {
  assertTrip(db, tripId);
  if (input.placeId !== null) {
    const place = db.query<{ trip_id: number }, [number]>("SELECT trip_id FROM places WHERE id = ?").get(input.placeId);
    if (!place || place.trip_id !== tripId) throw new HttpError(400, "The place is not in this trip");
  }
  const row = db
    .query<ExpenseRow, [number, number | null, string, number, string]>(
      "INSERT INTO expenses (trip_id, place_id, name, amount, spent_on) VALUES (?, ?, ?, ?, ?) RETURNING *",
    )
    .get(tripId, input.placeId, input.name, input.amount, input.spentOn);
  if (!row) throw new Error("Insert returned no row");
  return toExpense(row);
}

/**
 * Adds an expense from a place: parses `price`, names the expense after the place, and
 * marks a `want` place as `visited`, all in one transaction.
 */
export function addPlaceExpense(
  db: Database,
  placeId: number,
  price: string,
  spentOn: string,
): { expense: Expense; place: PlaceView } {
  const parsed = parsePrice(price);
  if (!parsed.ok) throw new HttpError(400, parsed.error);
  return db.transaction(() => {
    const place = getPlace(db, placeId);
    const expense = createExpense(db, place.tripId, {
      name: place.name,
      amount: parsed.value,
      spentOn,
      placeId,
    });
    if (place.status === "want") {
      db.query(
        "UPDATE places SET status = 'visited', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
      ).run(placeId);
    }
    return { expense, place: getPlace(db, placeId) };
  })();
}

/** Edits name, amount, or date. The place link never changes. */
export function updateExpense(db: Database, id: number, patch: ExpensePatch): Expense {
  const current = getExpense(db, id);
  const parsed = expenseInput.safeParse({ ...current, ...patch, placeId: current.placeId });
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid expense");
  const e = parsed.data;
  const row = db
    .query<ExpenseRow, [string, number, string, number]>(
      "UPDATE expenses SET name = ?, amount = ?, spent_on = ? WHERE id = ? RETURNING *",
    )
    .get(e.name, e.amount, e.spentOn, id);
  if (!row) throw new HttpError(404, "Expense not found");
  return toExpense(row);
}

export function deleteExpense(db: Database, id: number): void {
  const result = db.query("DELETE FROM expenses WHERE id = ?").run(id);
  if (result.changes === 0) throw new HttpError(404, "Expense not found");
}
