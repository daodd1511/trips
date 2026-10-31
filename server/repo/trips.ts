import type { Database } from "bun:sqlite";
import { isThemeKey, DEFAULT_THEME } from "../../shared/themes.ts";
import type { Trip, TripInput, TripPatch, TripSummary } from "../../shared/schemas.ts";
import { HttpError } from "../http.ts";

type TripRow = { id: number; name: string; currency: string; theme: string; created_at: string };
type SummaryRow = TripRow & {
  place_count: number;
  want_count: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
};

const toTrip = (r: TripRow): Trip => ({
  id: r.id,
  name: r.name,
  currency: r.currency,
  theme: isThemeKey(r.theme) ? r.theme : DEFAULT_THEME,
  createdAt: r.created_at,
});

const SUMMARY = `
  SELECT t.*,
    (SELECT COUNT(*) FROM places p WHERE p.trip_id = t.id) AS place_count,
    (SELECT COUNT(*) FROM places p WHERE p.trip_id = t.id AND p.status = 'want') AS want_count,
    (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS spent,
    (SELECT MIN(s.check_in) FROM stays s WHERE s.trip_id = t.id) AS start_date,
    (SELECT MAX(s.check_out) FROM stays s WHERE s.trip_id = t.id) AS end_date
  FROM trips t`;

const toSummary = (r: SummaryRow): TripSummary => ({
  ...toTrip(r),
  placeCount: r.place_count,
  wantCount: r.want_count,
  spent: r.spent,
  startDate: r.start_date,
  endDate: r.end_date,
});

export function listTrips(db: Database): TripSummary[] {
  return db.query<SummaryRow, []>(`${SUMMARY} ORDER BY t.created_at DESC, t.id DESC`).all().map(toSummary);
}

export function getTripSummary(db: Database, id: number): TripSummary {
  const row = db.query<SummaryRow, [number]>(`${SUMMARY} WHERE t.id = ?`).get(id);
  if (!row) throw new HttpError(404, "Trip not found");
  return toSummary(row);
}

export function getTrip(db: Database, id: number): Trip {
  const row = db.query<TripRow, [number]>("SELECT * FROM trips WHERE id = ?").get(id);
  if (!row) throw new HttpError(404, "Trip not found");
  return toTrip(row);
}

/** Creates a trip. The first trip ever created becomes the active trip. */
export function createTrip(db: Database, input: TripInput): Trip {
  return db.transaction(() => {
    const row = db
      .query<TripRow, [string, string, string]>(
        "INSERT INTO trips (name, currency, theme) VALUES (?, ?, ?) RETURNING *",
      )
      .get(input.name, input.currency, input.theme);
    if (!row) throw new Error("Insert returned no row");
    db.query("UPDATE settings SET active_trip_id = ? WHERE active_trip_id IS NULL").run(row.id);
    return toTrip(row);
  })();
}

/** Updates a trip. Changing the currency fails with 409 once the trip has expenses. */
export function updateTrip(db: Database, id: number, patch: TripPatch): Trip {
  return db.transaction(() => {
    const current = getTrip(db, id);
    const next = { ...current, ...patch };
    if (next.currency !== current.currency) {
      const used = db.query<{ n: number }, [number]>("SELECT COUNT(*) AS n FROM expenses WHERE trip_id = ?").get(id);
      if (used && used.n > 0) {
        throw new HttpError(409, "The currency can't change once the trip has expenses");
      }
    }
    const row = db
      .query<TripRow, [string, string, string, number]>(
        "UPDATE trips SET name = ?, currency = ?, theme = ? WHERE id = ? RETURNING *",
      )
      .get(next.name, next.currency, next.theme, id);
    if (!row) throw new HttpError(404, "Trip not found");
    return toTrip(row);
  })();
}

/** Deletes a trip with its places, stays, and expenses; clears it as the active trip. */
export function deleteTrip(db: Database, id: number): void {
  const result = db.query("DELETE FROM trips WHERE id = ?").run(id);
  if (result.changes === 0) throw new HttpError(404, "Trip not found");
}

export function getActiveTrip(db: Database): TripSummary | null {
  const row = db.query<{ active_trip_id: number | null }, []>("SELECT active_trip_id FROM settings").get();
  return row?.active_trip_id ? getTripSummary(db, row.active_trip_id) : null;
}

export function setActiveTrip(db: Database, tripId: number): TripSummary {
  const summary = getTripSummary(db, tripId);
  db.query("UPDATE settings SET active_trip_id = ?").run(tripId);
  return summary;
}

/** Throws 404 unless the trip exists. */
export function assertTrip(db: Database, id: number): void {
  if (!db.query("SELECT 1 FROM trips WHERE id = ?").get(id)) throw new HttpError(404, "Trip not found");
}
