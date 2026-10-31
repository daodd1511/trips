/** Digit groups joined by single spaces, dots, or hyphens, with an optional leading `+`. */
const RUN = /\+?\d+(?:[ .-]\d+)*/g;

/**
 * Finds the first phone number in free text: 9 to 11 digits, optionally starting with `+`,
 * separated by spaces, dots, or hyphens. A number may follow other digits in the same run,
 * such as a house number or a price. Returns it in `tel:` form (digits and a leading `+`
 * only), or null when the text has none.
 */
export function findPhoneNumber(text: string): string | null {
  for (const match of text.matchAll(RUN)) {
    const run = match[0];
    const plus = run.startsWith("+");
    const groups = run.replace(/^\+/, "").split(/[ .-]/);

    for (let start = 0; start < groups.length; start++) {
      let digits = "";
      let best: string | null = null;
      for (let end = start; end < groups.length; end++) {
        digits += groups[end];
        if (digits.length > 11) break;
        if (digits.length >= 9) best = digits;
      }
      if (best) return (plus && start === 0 ? "+" : "") + best;
    }
  }
  return null;
}
