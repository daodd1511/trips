import type { Place } from "../../shared/schemas.ts";

/**
 * Where Directions should go: the saved Maps link, else a Google Maps search for the
 * address, else null when the place has neither.
 */
export function directionsUrl(place: Pick<Place, "mapsUrl" | "address">): string | null {
  if (place.mapsUrl) return place.mapsUrl;
  if (place.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
  return null;
}
