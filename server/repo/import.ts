import type { Database } from "bun:sqlite";
import type { ExportFile, ExportTrip } from "../../shared/export.ts";
import { DEFAULT_THEME, isThemeKey } from "../../shared/themes.ts";
import { categoryKey } from "../db.ts";

export type ImportResult = { trips: { id: number; name: string }[] };

/**
 * Imports every trip in a validated export file as new trips, in one transaction. A
 * trip whose name exists gets ` (imported <today>)`, plus a counter if that exists too.
 * Categories match by name ignoring case and Unicode form; missing ones are created.
 */
export function importFile(db: Database, file: ExportFile, today: string): ImportResult {
  return db.transaction(() => {
    const categoryIds = new Map(
      db
        .query<{ id: number; name_key: string }, []>("SELECT id, name_key FROM categories")
        .all()
        .map((c) => [c.name_key, c.id]),
    );
    const otherId = db.query<{ id: number }, []>("SELECT id FROM categories WHERE is_system = 1").get()?.id;
    if (otherId === undefined) throw new Error("The system category Other is missing");

    const categoryId = (name: string): number => {
      const key = categoryKey(name);
      const existing = categoryIds.get(key);
      if (existing !== undefined) return existing;
      const row = db
        .query<{ id: number }, [string, string]>("INSERT INTO categories (name, name_key) VALUES (?, ?) RETURNING id")
        .get(name.trim().normalize("NFC"), key);
      if (!row) throw new Error("Insert returned no row");
      categoryIds.set(key, row.id);
      return row.id;
    };

    const trips = file.trips.map((trip) => importTrip(db, trip, today, categoryId, otherId));
    return { trips };
  })();
}

const TRIP_NAME_MAX = 200;

/** `name` cut to fit before `suffix` within the trip name limit, counted in code points. */
function withSuffix(name: string, suffix: string): string {
  const room = TRIP_NAME_MAX - Array.from(suffix).length;
  return Array.from(name).slice(0, room).join("").trimEnd() + suffix;
}

function freeTripName(db: Database, name: string, today: string): string {
  const taken = (n: string) => db.query("SELECT 1 FROM trips WHERE name = ?").get(n) !== null;
  if (!taken(name)) return name;
  const suffix = ` (imported ${today})`;
  const base = withSuffix(name, suffix);
  if (!taken(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = withSuffix(name, `${suffix} ${i}`);
    if (!taken(candidate)) return candidate;
  }
}

function importTrip(
  db: Database,
  trip: ExportTrip,
  today: string,
  categoryId: (name: string) => number,
  otherId: number,
): { id: number; name: string } {
  const name = freeTripName(db, trip.name, today);
  const theme = isThemeKey(trip.theme) ? trip.theme : DEFAULT_THEME;
  const tripRow = db
    .query<{ id: number }, [string, string, string]>(
      "INSERT INTO trips (name, currency, theme) VALUES (?, ?, ?) RETURNING id",
    )
    .get(name, trip.currency, theme);
  if (!tripRow) throw new Error("Insert returned no row");
  const tripId = tripRow.id;
  db.query("UPDATE settings SET active_trip_id = ? WHERE active_trip_id IS NULL").run(tripId);

  const insertPlace = db.query<
    { id: number },
    [number, string, string | null, string | null, string | null, string | null, string, number | null]
  >(
    `INSERT INTO places (trip_id, name, address, maps_url, source_url, notes, status, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  );
  const link = db.query("INSERT OR IGNORE INTO place_categories (place_id, category_id) VALUES (?, ?)");
  const placeIds = new Map<number, number>();
  for (const p of trip.places) {
    const row = insertPlace.get(tripId, p.name, p.address, p.mapsUrl, p.sourceUrl, p.notes, p.status, p.rating);
    if (!row) throw new Error("Insert returned no row");
    placeIds.set(p.ref, row.id);
    const ids = p.categories.length ? p.categories.map(categoryId) : [otherId];
    for (const id of ids) link.run(row.id, id);
  }

  const insertStay = db.query(
    "INSERT INTO stays (trip_id, name, maps_url, check_in, check_out, notes) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const s of trip.stays) insertStay.run(tripId, s.name, s.mapsUrl, s.checkIn, s.checkOut, s.notes);

  const insertExpense = db.query(
    "INSERT INTO expenses (trip_id, place_id, name, amount, spent_on) VALUES (?, ?, ?, ?, ?)",
  );
  for (const e of trip.expenses) {
    const placeId = e.placeRef === null ? null : (placeIds.get(e.placeRef) ?? null);
    insertExpense.run(tripId, placeId, e.name, e.amount, e.spentOn);
  }

  return { id: tripId, name };
}
