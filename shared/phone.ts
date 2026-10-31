/** A Vietnamese number written as 10 digits starting with 0, not part of a longer digit run. */
const PHONE = /(?<!\d)0\d{9}(?!\d)/;

/**
 * Finds the first phone number in free text, written as 10 digits starting with `0` with
 * no separators, such as `0358937727`. Returns null for any other form rather than
 * guessing which digits belong together.
 */
export function findPhoneNumber(text: string): string | null {
  return PHONE.exec(text)?.[0] ?? null;
}
