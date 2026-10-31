import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { exportFileSchema, type ExportFile } from "../../shared/export.ts";
import { searchKey } from "../../shared/search.ts";
import { HttpError, idParam, jsonBody } from "../http.ts";
import { exportTrips } from "../repo/export.ts";
import { importFile } from "../repo/import.ts";

const IMPORT_LIMIT_BYTES = 5 * 1024 * 1024;

function slug(text: string): string {
  return searchKey(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
}

/** `now` is the clock in epoch ms; `today` is the trip-zone calendar date. */
export function exportRoutes(db: Database, now: () => number, today: () => string) {
  const download = (file: ExportFile, name: string) =>
    new Response(JSON.stringify(file, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="trips-${name}-${today()}.json"`,
      },
    });

  return new Hono()
    .get("/export", () => download(exportTrips(db, new Date(now())), "all"))
    .get("/trips/:id/export", idParam, (c) => {
      const file = exportTrips(db, new Date(now()), [c.req.valid("param").id]);
      return download(file, slug(file.trips[0]?.name ?? "trip"));
    })
    .post(
      "/import",
      bodyLimit({
        maxSize: IMPORT_LIMIT_BYTES,
        onError: () => {
          throw new HttpError(400, "The file is larger than 5 MB");
        },
      }),
      jsonBody(exportFileSchema),
      (c) => c.json(importFile(db, c.req.valid("json"), today()), 201),
    );
}
