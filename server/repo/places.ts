import type { Database } from "bun:sqlite";
import { placeInput, type PlaceInput, type PlacePatch, type PlaceStatus, type PlaceView } from "../../shared/schemas.ts";
import { searchKey } from "../../shared/search.ts";
import { HttpError } from "../http.ts";
import { assertCategories, otherCategoryId } from "./categories.ts";
import { assertTrip } from "./trips.ts";

type PlaceRow = {
  id: number;
  trip_id: number;
  name: string;
  address: string | null;
  maps_url: string | null;
  source_url: string | null;
  notes: string | null;
  status: PlaceStatus;
  rating: number | null;
  created_at: string;
  updated_at: string;
  category_ids: string | null;
  spent: number;
};

const SELECT = `
  SELECT p.*,
    (SELECT group_concat(category_id) FROM place_categories pc WHERE pc.place_id = p.id) AS category_ids,
    (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.place_id = p.id) AS spent
  FROM places p`;

const toView = (r: PlaceRow): PlaceView => ({
  id: r.id,
  tripId: r.trip_id,
  name: r.name,
  address: r.address,
  mapsUrl: r.maps_url,
  sourceUrl: r.source_url,
  notes: r.notes,
  status: r.status,
  rating: r.rating,
  categoryIds: r.category_ids ? r.category_ids.split(",").map(Number).sort((a, b) => a - b) : [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  spent: r.spent,
});

export type PlaceFilter = {
  status?: PlaceStatus;
  /** Matches places in any of these categories. */
  categoryIds?: number[];
  /** Matches name, address, or notes, ignoring case and Vietnamese marks. */
  q?: string;
};

/** Places in a trip, newest first, narrowed by `filter`. */
export function listPlaces(db: Database, tripId: number, filter: PlaceFilter = {}): PlaceView[] {
  assertTrip(db, tripId);
  const rows = db
    .query<PlaceRow, [number]>(`${SELECT} WHERE p.trip_id = ? ORDER BY p.created_at DESC, p.id DESC`)
    .all(tripId)
    .map(toView);
  const q = filter.q ? searchKey(filter.q.trim()) : "";
  return rows.filter(
    (p) =>
      (!filter.status || p.status === filter.status) &&
      (!filter.categoryIds?.length || p.categoryIds.some((c) => filter.categoryIds?.includes(c))) &&
      (!q || searchKey([p.name, p.address, p.notes].filter(Boolean).join("\n")).includes(q)),
  );
}

export function getPlace(db: Database, id: number): PlaceView {
  const row = db.query<PlaceRow, [number]>(`${SELECT} WHERE p.id = ?`).get(id);
  if (!row) throw new HttpError(404, "Place not found");
  return toView(row);
}

/** Another place in the same trip with the same Maps link, if any. Places without a link never match. */
function findDuplicate(db: Database, tripId: number, mapsUrl: string | null, exceptId: number | null) {
  if (mapsUrl === null) return null;
  return (
    db
      .query<{ id: number; name: string }, [number, string, number]>(
        "SELECT id, name FROM places WHERE trip_id = ? AND maps_url = ? AND id != ? ORDER BY id LIMIT 1",
      )
      .get(tripId, mapsUrl, exceptId ?? 0) ?? null
  );
}

function setCategories(db: Database, placeId: number, ids: number[]): void {
  const unique = [...new Set(ids.length ? ids : [otherCategoryId(db)])];
  assertCategories(db, unique);
  db.query("DELETE FROM place_categories WHERE place_id = ?").run(placeId);
  const insert = db.query("INSERT INTO place_categories (place_id, category_id) VALUES (?, ?)");
  for (const id of unique) insert.run(placeId, id);
}

export type PlaceSaveResult = {
  place: PlaceView;
  /** Another place in the trip with the same Maps link; the save still succeeds. */
  duplicateOf: { id: number; name: string } | null;
};

export function createPlace(db: Database, tripId: number, input: PlaceInput): PlaceSaveResult {
  return db.transaction(() => {
    assertTrip(db, tripId);
    const row = db
      .query<
        { id: number },
        [number, string, string | null, string | null, string | null, string | null, string, number | null]
      >(
        `INSERT INTO places (trip_id, name, address, maps_url, source_url, notes, status, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .get(tripId, input.name, input.address, input.mapsUrl, input.sourceUrl, input.notes, input.status, input.rating);
    if (!row) throw new Error("Insert returned no row");
    setCategories(db, row.id, input.categoryIds);
    return { place: getPlace(db, row.id), duplicateOf: findDuplicate(db, tripId, input.mapsUrl, row.id) };
  })();
}

/**
 * Applies `patch` to a place. Leaving `visited` clears the rating; a rating on a place
 * that is not visited fails with 400.
 */
export function updatePlace(db: Database, id: number, patch: PlacePatch): PlaceSaveResult {
  return db.transaction(() => {
    const current = getPlace(db, id);
    const status = patch.status ?? current.status;
    const merged = {
      name: current.name,
      address: current.address,
      mapsUrl: current.mapsUrl,
      sourceUrl: current.sourceUrl,
      notes: current.notes,
      categoryIds: current.categoryIds,
      ...patch,
      status,
      rating: patch.rating !== undefined ? patch.rating : status === "visited" ? current.rating : null,
    };
    const parsed = placeInput.safeParse(merged);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid place");
    const next = parsed.data;

    db.query(
      `UPDATE places SET name = ?, address = ?, maps_url = ?, source_url = ?, notes = ?, status = ?, rating = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(next.name, next.address, next.mapsUrl, next.sourceUrl, next.notes, next.status, next.rating, id);
    if (patch.categoryIds !== undefined) setCategories(db, id, next.categoryIds);
    return { place: getPlace(db, id), duplicateOf: findDuplicate(db, current.tripId, next.mapsUrl, id) };
  })();
}

/** Deletes a place. Its expenses remain, unlinked. */
export function deletePlace(db: Database, id: number): void {
  const result = db.query("DELETE FROM places WHERE id = ?").run(id);
  if (result.changes === 0) throw new HttpError(404, "Place not found");
}
