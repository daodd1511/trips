import type { Database } from "bun:sqlite";
import type { Category, CategoryView } from "../../shared/schemas.ts";
import { categoryKey } from "../db.ts";
import { HttpError } from "../http.ts";

type CategoryRow = { id: number; name: string; is_system: number; place_count: number };

const toView = (r: CategoryRow): CategoryView => ({
  id: r.id,
  name: r.name,
  isSystem: r.is_system === 1,
  placeCount: r.place_count,
});

/** All categories in creation order, Other last, with place counts within `tripId` or overall. */
export function listCategories(db: Database, tripId?: number): CategoryView[] {
  const sql = `
    SELECT c.id, c.name, c.is_system,
      (SELECT COUNT(*) FROM place_categories pc JOIN places p ON p.id = pc.place_id
        WHERE pc.category_id = c.id AND (? IS NULL OR p.trip_id = ?)) AS place_count
    FROM categories c ORDER BY c.is_system, c.id`;
  const scope = tripId ?? null;
  return db.query<CategoryRow, [number | null, number | null]>(sql).all(scope, scope).map(toView);
}

export function otherCategoryId(db: Database): number {
  const row = db.query<{ id: number }, []>("SELECT id FROM categories WHERE is_system = 1").get();
  if (!row) throw new Error("The system category Other is missing");
  return row.id;
}

function getRow(db: Database, id: number): { id: number; name: string; is_system: number } {
  const row = db.query<{ id: number; name: string; is_system: number }, [number]>(
    "SELECT id, name, is_system FROM categories WHERE id = ?",
  ).get(id);
  if (!row) throw new HttpError(404, "Category not found");
  return row;
}

function assertNameFree(db: Database, name: string, exceptId: number | null): void {
  const clash = db.query<{ id: number }, [string]>("SELECT id FROM categories WHERE name_key = ?").get(categoryKey(name));
  if (clash && clash.id !== exceptId) throw new HttpError(409, `A category named “${name}” already exists`);
}

export function createCategory(db: Database, name: string): Category {
  assertNameFree(db, name, null);
  const row = db
    .query<{ id: number; name: string }, [string, string]>(
      "INSERT INTO categories (name, name_key) VALUES (?, ?) RETURNING id, name",
    )
    .get(name.normalize("NFC"), categoryKey(name));
  if (!row) throw new Error("Insert returned no row");
  return { id: row.id, name: row.name, isSystem: false };
}

export function renameCategory(db: Database, id: number, name: string): Category {
  const current = getRow(db, id);
  if (current.is_system) throw new HttpError(403, "Other can't be renamed");
  assertNameFree(db, name, id);
  db.query("UPDATE categories SET name = ?, name_key = ? WHERE id = ?").run(name.normalize("NFC"), categoryKey(name), id);
  return { id, name: name.normalize("NFC"), isSystem: false };
}

/**
 * Deletes a category and removes it from every place, in one transaction. Places left
 * with no category move to Other.
 */
export function deleteCategory(db: Database, id: number): { removedFrom: number; movedToOther: number } {
  return db.transaction(() => {
    const current = getRow(db, id);
    if (current.is_system) throw new HttpError(403, "Other can't be deleted");

    const placeIds = db
      .query<{ place_id: number }, [number]>("SELECT place_id FROM place_categories WHERE category_id = ?")
      .all(id)
      .map((r) => r.place_id);
    db.query("DELETE FROM categories WHERE id = ?").run(id);

    const other = otherCategoryId(db);
    let movedToOther = 0;
    for (const placeId of placeIds) {
      const left = db.query("SELECT 1 FROM place_categories WHERE place_id = ? LIMIT 1").get(placeId);
      if (!left) {
        db.query("INSERT INTO place_categories (place_id, category_id) VALUES (?, ?)").run(placeId, other);
        movedToOther++;
      }
    }
    return { removedFrom: placeIds.length, movedToOther };
  })();
}

/** Throws 400 unless every id names an existing category. */
export function assertCategories(db: Database, ids: number[]): void {
  for (const id of ids) {
    if (!db.query("SELECT 1 FROM categories WHERE id = ?").get(id)) {
      throw new HttpError(400, `Category ${id} does not exist`);
    }
  }
}
