import type { Database } from "bun:sqlite";
import { EXPORT_VERSION, type ExportFile, type ExportTrip } from "../../shared/export.ts";
import type { PlaceStatus } from "../../shared/schemas.ts";
import { HttpError } from "../http.ts";

type TripRow = { id: number; name: string; currency: string; theme: string };

/** Serializes the given trips, or every trip when `tripIds` is omitted, oldest first. */
export function exportTrips(db: Database, now: Date, tripIds?: number[]): ExportFile {
  const rows = tripIds
    ? tripIds.map((id) => {
        const row = db.query<TripRow, [number]>("SELECT id, name, currency, theme FROM trips WHERE id = ?").get(id);
        if (!row) throw new HttpError(404, "Trip not found");
        return row;
      })
    : db.query<TripRow, []>("SELECT id, name, currency, theme FROM trips ORDER BY created_at, id").all();
  if (rows.length === 0) throw new HttpError(404, "There are no trips to export");
  return { version: EXPORT_VERSION, exportedAt: now.toISOString(), trips: rows.map((t) => exportTrip(db, t)) };
}

function exportTrip(db: Database, trip: TripRow): ExportTrip {
  const places = db
    .query<
      {
        id: number;
        name: string;
        maps_url: string;
        source_url: string | null;
        notes: string | null;
        status: PlaceStatus;
        rating: number | null;
      },
      [number]
    >("SELECT id, name, maps_url, source_url, notes, status, rating FROM places WHERE trip_id = ? ORDER BY id")
    .all(trip.id);
  const categoryNames = db.query<{ name: string }, [number]>(
    `SELECT c.name FROM place_categories pc JOIN categories c ON c.id = pc.category_id
     WHERE pc.place_id = ? ORDER BY c.is_system, c.id`,
  );
  const refOf = new Map(places.map((p, i) => [p.id, i + 1]));

  return {
    name: trip.name,
    currency: trip.currency,
    theme: trip.theme,
    places: places.map((p) => ({
      ref: refOf.get(p.id) ?? 0,
      name: p.name,
      mapsUrl: p.maps_url,
      sourceUrl: p.source_url,
      notes: p.notes,
      status: p.status,
      rating: p.rating,
      categories: categoryNames.all(p.id).map((c) => c.name),
    })),
    stays: db
      .query<
        { name: string; maps_url: string | null; check_in: string | null; check_out: string | null; notes: string | null },
        [number]
      >("SELECT name, maps_url, check_in, check_out, notes FROM stays WHERE trip_id = ? ORDER BY id")
      .all(trip.id)
      .map((s) => ({ name: s.name, mapsUrl: s.maps_url, checkIn: s.check_in, checkOut: s.check_out, notes: s.notes })),
    expenses: db
      .query<{ name: string; amount: number; spent_on: string; place_id: number | null }, [number]>(
        "SELECT name, amount, spent_on, place_id FROM expenses WHERE trip_id = ? ORDER BY id",
      )
      .all(trip.id)
      .map((e) => ({
        name: e.name,
        amount: e.amount,
        spentOn: e.spent_on,
        placeRef: e.place_id === null ? null : (refOf.get(e.place_id) ?? null),
      })),
  };
}
