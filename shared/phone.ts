const CANDIDATE = /\+?\d[\d .-]*\d/g;

/**
 * Finds the first phone number in free text: 9 to 11 digits, optionally starting with `+`,
 * separated by spaces, dots, or hyphens. Returns it in `tel:` form (digits and a leading
 * `+` only), or null when the text has none.
 */
export function findPhoneNumber(text: string): string | null {
  for (const match of text.matchAll(CANDIDATE)) {
    const raw = match[0];
    if (/[ .-]{2,}/.test(raw)) continue;
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 11) {
      return (raw.startsWith("+") ? "+" : "") + digits;
    }
  }
  return null;
}
