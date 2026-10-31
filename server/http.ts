import { validator } from "hono/validator";
import type { z } from "zod";

/** An error with an HTTP status, rendered by the app's error handler as `{ error }`. */
export class HttpError extends Error {
  readonly status: 400 | 403 | 404 | 409;

  constructor(status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

/** Validates the JSON body against `schema`; responds 400 with the first issue on failure. */
export function jsonBody<S extends z.ZodType>(schema: S) {
  return validator("json", (value, c) => {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data as z.output<S>;
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  });
}

/** Parses the `:id` route parameter as a positive integer; responds 404 otherwise. */
export const idParam = validator("param", (value: Record<string, string>, c) => {
  const id = Number(value.id);
  if (Number.isSafeInteger(id) && id > 0) return { id };
  return c.json({ error: "Not found" }, 404);
});

/** Today's calendar date as `YYYY-MM-DD` in `timeZone`. */
export function todayIn(timeZone: string, now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
