import { z } from "zod";
import { DEFAULT_THEME, THEME_KEYS } from "./themes.ts";

export const PLACE_STATUSES = ["want", "visited", "skipped"] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export const NOTES_MAX = 2000;
export const ADDRESS_MAX = 300;

const name = z.string().trim().min(1).max(200);
const url = z.url().max(2000);
const notes = z.string().trim().max(NOTES_MAX);
const address = z.string().trim().min(1).max(ADDRESS_MAX);
/** Calendar date as `YYYY-MM-DD`. */
const date = z.iso.date();
const id = z.number().int().positive();

export const tripInput = z.object({
  name,
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter ISO 4217 code, such as VND"),
  theme: z.enum(THEME_KEYS).default(DEFAULT_THEME),
});
export type TripInput = z.infer<typeof tripInput>;

export const placeInput = z
  .object({
    name,
    address: address.nullable().default(null),
    mapsUrl: url.nullable().default(null),
    sourceUrl: url.nullable().default(null),
    notes: notes.nullable().default(null),
    status: z.enum(PLACE_STATUSES).default("want"),
    rating: z.number().int().min(1).max(10).nullable().default(null),
    /** Empty means the system category Other. */
    categoryIds: z.array(id).default([]),
  })
  .refine((p) => p.rating === null || p.status === "visited", {
    message: "Only a visited place can have a rating",
    path: ["rating"],
  });
export type PlaceInput = z.infer<typeof placeInput>;

export const categoryInput = z.object({ name: z.string().trim().min(1).max(40) });
export type CategoryInput = z.infer<typeof categoryInput>;

export const stayInput = z
  .object({
    name,
    mapsUrl: url.nullable().default(null),
    checkIn: date.nullable().default(null),
    checkOut: date.nullable().default(null),
    notes: notes.nullable().default(null),
  })
  .refine((s) => !s.checkIn || !s.checkOut || s.checkOut >= s.checkIn, {
    message: "Check-out must be on or after check-in",
    path: ["checkOut"],
  });
export type StayInput = z.infer<typeof stayInput>;

export const expenseInput = z.object({
  name,
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  spentOn: date,
  placeId: id.nullable().default(null),
});
export type ExpenseInput = z.infer<typeof expenseInput>;

export type Trip = {
  id: number;
  name: string;
  currency: string;
  theme: z.infer<typeof tripInput>["theme"];
  createdAt: string;
};

export type Category = {
  id: number;
  name: string;
  /** True for Other, which cannot be renamed or deleted. */
  isSystem: boolean;
};

export type Place = {
  id: number;
  tripId: number;
  name: string;
  /** Street address as typed, for places without a usable map pin. */
  address: string | null;
  mapsUrl: string | null;
  sourceUrl: string | null;
  notes: string | null;
  status: PlaceStatus;
  rating: number | null;
  categoryIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type Stay = {
  id: number;
  tripId: number;
  name: string;
  mapsUrl: string | null;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  createdAt: string;
};

export type Expense = {
  id: number;
  tripId: number;
  /** Place the expense was added from; null for free entries or a deleted place. */
  placeId: number | null;
  name: string;
  amount: number;
  spentOn: string;
  createdAt: string;
};

/** A trip with figures for lists and headers. Dates derive from its stays. */
export type TripSummary = Trip & {
  placeCount: number;
  wantCount: number;
  /** Sum of the trip's expenses, in its currency's main unit. */
  spent: number;
  /** Earliest stay check-in, or null when no stay has dates. */
  startDate: string | null;
  /** Latest stay check-out, or null when no stay has dates. */
  endDate: string | null;
};

/** A place with the sum of expenses linked to it. */
export type PlaceView = Place & { spent: number };

/** A category with the number of places that use it in the requested scope. */
export type CategoryView = Category & { placeCount: number };

export type ExpenseDay = { date: string; total: number; count: number };

export type ExpenseList = {
  /** Newest first. */
  items: Expense[];
  total: number;
  /** One entry per `spentOn` date, newest first. */
  days: ExpenseDay[];
};

// Patch schemas carry no defaults: Zod applies `.default()` even inside `.partial()`,
// which would reset omitted fields on update.

export const tripPatch = z
  .object({ name, currency: tripInput.shape.currency, theme: z.enum(THEME_KEYS) })
  .partial();
export type TripPatch = z.infer<typeof tripPatch>;

export const placePatch = z
  .object({
    name,
    address: address.nullable(),
    mapsUrl: url.nullable(),
    sourceUrl: url.nullable(),
    notes: notes.nullable(),
    status: z.enum(PLACE_STATUSES),
    rating: z.number().int().min(1).max(10).nullable(),
    categoryIds: z.array(id),
  })
  .partial();
export type PlacePatch = z.infer<typeof placePatch>;

export const stayPatch = z
  .object({ name, mapsUrl: url.nullable(), checkIn: date.nullable(), checkOut: date.nullable(), notes: notes.nullable() })
  .partial();
export type StayPatch = z.infer<typeof stayPatch>;

export const expensePatch = z.object({ name, amount: expenseInput.shape.amount, spentOn: date }).partial();
export type ExpensePatch = z.infer<typeof expensePatch>;

/** Body for adding an expense from a place: the price as typed, such as `49k`. */
export const placeExpenseInput = z.object({ price: z.string().trim().min(1).max(40), spentOn: date.optional() });
export type PlaceExpenseInput = z.infer<typeof placeExpenseInput>;
