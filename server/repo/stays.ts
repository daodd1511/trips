import type { Database } from "bun:sqlite";
import { stayInput, type Stay, type StayInput, type StayPatch } from "../../shared/schemas.ts";
import { HttpError } from "../http.ts";
import { assertTrip } from "./trips.ts";

type StayRow = {
  id: number;
  trip_id: number;
  name: string;
  maps_url: string | null;
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
  created_at: string;
};

const toStay = (r: StayRow): Stay => ({
  id: r.id,
  tripId: r.trip_id,
  name: r.name,
  mapsUrl: r.maps_url,
  checkIn: r.check_in,
  checkOut: r.check_out,
  notes: r.notes,
  createdAt: r.created_at,
});

/** Stays by check-in date, then stays without a date in creation order. */
export function listStays(db: Database, tripId: number): Stay[] {
  assertTrip(db, tripId);
  return db
    .query<StayRow, [number]>(
      "SELECT * FROM stays WHERE trip_id = ? ORDER BY check_in IS NULL, check_in, created_at, id",
    )
    .all(tripId)
    .map(toStay);
}

function getStay(db: Database, id: number): Stay {
  const row = db.query<StayRow, [number]>("SELECT * FROM stays WHERE id = ?").get(id);
  if (!row) throw new HttpError(404, "Stay not found");
  return toStay(row);
}

export function createStay(db: Database, tripId: number, input: StayInput): Stay {
  assertTrip(db, tripId);
  const row = db
    .query<StayRow, [number, string, string | null, string | null, string | null, string | null]>(
      `INSERT INTO stays (trip_id, name, maps_url, check_in, check_out, notes)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(tripId, input.name, input.mapsUrl, input.checkIn, input.checkOut, input.notes);
  if (!row) throw new Error("Insert returned no row");
  return toStay(row);
}

export function updateStay(db: Database, id: number, patch: StayPatch): Stay {
  const current = getStay(db, id);
  const parsed = stayInput.safeParse({ ...current, ...patch });
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid stay");
  const s = parsed.data;
  const row = db
    .query<StayRow, [string, string | null, string | null, string | null, string | null, number]>(
      "UPDATE stays SET name = ?, maps_url = ?, check_in = ?, check_out = ?, notes = ? WHERE id = ? RETURNING *",
    )
    .get(s.name, s.mapsUrl, s.checkIn, s.checkOut, s.notes, id);
  if (!row) throw new HttpError(404, "Stay not found");
  return toStay(row);
}

export function deleteStay(db: Database, id: number): void {
  const result = db.query("DELETE FROM stays WHERE id = ?").run(id);
  if (result.changes === 0) throw new HttpError(404, "Stay not found");
}
