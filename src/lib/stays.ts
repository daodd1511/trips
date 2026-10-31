import type { Stay } from "../../shared/schemas.ts";

/**
 * The stay that covers `today`, else the next one to start, else the first one.
 * `stays` must be in server order (by check-in, undated last).
 */
export function currentStay(stays: readonly Stay[], today: string): Stay | null {
  const covering = stays.find((s) => s.checkIn && s.checkOut && s.checkIn <= today && today < s.checkOut);
  if (covering) return covering;
  const next = stays.find((s) => s.checkIn && s.checkIn >= today);
  return next ?? stays[0] ?? null;
}
