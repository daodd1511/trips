import { z } from "zod";
import { NOTES_MAX, PLACE_STATUSES } from "./schemas.ts";

export const EXPORT_VERSION = 1;

const name = z.string().trim().min(1).max(200);
const url = z.url().max(2000);
const notes = z.string().max(NOTES_MAX).nullable();
const date = z.iso.date();

const exportPlace = z
  .object({
    /** Identifier local to this file, referenced by `expenses[].placeRef`. */
    ref: z.number().int().positive(),
    name,
    mapsUrl: url,
    sourceUrl: url.nullable(),
    notes,
    status: z.enum(PLACE_STATUSES),
    rating: z.number().int().min(1).max(10).nullable(),
    /** Category names; matched case-insensitively on import. Empty means Other. */
    categories: z.array(z.string().trim().min(1).max(40)),
  })
  .refine((p) => p.rating === null || p.status === "visited", {
    message: "Only a visited place can have a rating",
    path: ["rating"],
  });

const exportStay = z
  .object({ name, mapsUrl: url.nullable(), checkIn: date.nullable(), checkOut: date.nullable(), notes })
  .refine((s) => !s.checkIn || !s.checkOut || s.checkOut >= s.checkIn, {
    message: "Check-out must be on or after check-in",
    path: ["checkOut"],
  });

const exportExpense = z.object({
  name,
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  spentOn: date,
  /** `ref` of a place in the same trip, or null for a free expense. */
  placeRef: z.number().int().positive().nullable(),
});

const exportTrip = z
  .object({
    name,
    currency: z.string().regex(/^[A-Z]{3}$/),
    /** Palette key; an unknown key imports as the default palette. */
    theme: z.string().max(40),
    places: z.array(exportPlace),
    stays: z.array(exportStay),
    expenses: z.array(exportExpense),
  })
  .superRefine((trip, ctx) => {
    const refs = new Set<number>();
    trip.places.forEach((p, i) => {
      if (refs.has(p.ref)) ctx.addIssue({ code: "custom", message: `Duplicate place ref ${p.ref}`, path: ["places", i, "ref"] });
      refs.add(p.ref);
    });
    trip.expenses.forEach((e, i) => {
      if (e.placeRef !== null && !refs.has(e.placeRef)) {
        ctx.addIssue({ code: "custom", message: `Unknown place ref ${e.placeRef}`, path: ["expenses", i, "placeRef"] });
      }
    });
  });

/** The JSON file produced by export and accepted by import. */
export const exportFileSchema = z.object({
  version: z.literal(EXPORT_VERSION, { error: "Unsupported export version" }),
  exportedAt: z.string(),
  trips: z.array(exportTrip).min(1),
});

export type ExportFile = z.infer<typeof exportFileSchema>;
export type ExportTrip = ExportFile["trips"][number];
