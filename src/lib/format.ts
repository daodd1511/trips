/** Formats an amount in the currency's main unit, for example `559.000 ₫` or `9,840 ฿`. */
export function formatMoney(amount: number, currency: string): string {
  if (currency === "VND") return `${amount.toLocaleString("vi-VN")} ₫`;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

/** Short amount for compact surfaces: `310k`, `1,5tr` in VND; the full amount otherwise. */
export function formatMoneyShort(amount: number, currency: string): string {
  if (currency !== "VND") return formatMoney(amount, currency);
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
  return String(amount);
}

function parseDate(date: string): Date {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** `Wed, Nov 19` from `2026-11-19`. */
export function formatDay(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** `Nov 19` from `2026-11-19`. */
export function formatShortDate(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** `Nov 18 – 22, 2026`, `Nov 30 – Dec 2, 2026`, or null without both dates. */
export function formatRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const a = parseDate(start);
  const b = parseDate(end);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const right = sameMonth
    ? String(b.getDate())
    : b.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${left} – ${right}, ${b.getFullYear()}`;
}

/** Whole nights between two `YYYY-MM-DD` dates. */
export function nightsBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000);
}

/** Today in the browser's local zone as `YYYY-MM-DD`. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
