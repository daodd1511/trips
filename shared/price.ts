/** Result of a parse that never guesses: a value, or a message for the user. */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const PRICE = /^(\d+)(?:[.,](\d+))?(k|tr)?$/i;
const MULTIPLIER = { k: 1_000, tr: 1_000_000 } as const;

/**
 * Parses one price token, such as `30k`, `30000`, or `1.5tr`, into a whole amount in the
 * currency's main unit. A decimal separator is accepted only with a `k` or `tr` suffix,
 * so `30.000` fails instead of parsing as 30.
 */
export function parsePrice(token: string): ParseResult<number> {
  const match = PRICE.exec(token.trim());
  if (!match) return { ok: false, error: "The price must look like 30k, 30000, or 1.5tr" };

  const [, whole = "", fraction, suffix] = match;
  if (fraction !== undefined && suffix === undefined) {
    return { ok: false, error: "Use 30k or 30000, not 30.000" };
  }

  const multiplier = suffix ? MULTIPLIER[suffix.toLowerCase() as keyof typeof MULTIPLIER] : 1;
  const digits = fraction ?? "";
  const scale = 10 ** digits.length;
  const scaled = (Number(whole) * scale + Number(digits || "0")) * multiplier;
  if (scaled % scale !== 0) return { ok: false, error: "The price must be a whole number" };

  const amount = scaled / scale;
  if (!Number.isSafeInteger(amount)) return { ok: false, error: "The price is too large" };
  if (amount <= 0) return { ok: false, error: "The price must be more than 0" };
  return { ok: true, value: amount };
}

/**
 * Parses a quick-entry line in the form `{name} {price}`. The price is the last token
 * after a space; everything before it is the name.
 */
export function parseQuickEntry(line: string): ParseResult<{ name: string; amount: number }> {
  const text = line.trim();
  const cut = text.lastIndexOf(" ");
  if (cut === -1) return { ok: false, error: "Write a name, then a price: banh mi 30k" };

  const name = text.slice(0, cut).trim();
  if (!name) return { ok: false, error: "Write a name before the price" };

  const price = parsePrice(text.slice(cut + 1));
  return price.ok ? { ok: true, value: { name, amount: price.value } } : price;
}
