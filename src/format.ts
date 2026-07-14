// Number formatting + parsing — ported verbatim from the DC prototype so the
// rendered output matches to the character (Swiss apostrophe grouping, U+2212
// minus, en-dash for empty).

const DASH = "–"; // – (en dash) for empty / zero
const MINUS = "−"; // − (real minus sign) for negatives

/** Format a number the way the report does. `dashZero` renders a dash for ~0. */
export function fmt(n: number | null | undefined, dashZero = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return DASH;
  if (dashZero && Math.abs(n) < 0.005) return DASH;
  const neg = n < -0.005;
  const a = Math.abs(n);
  const s = Number.isInteger(a) ? String(a) : a.toFixed(2);
  const parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? MINUS : "") + parts.join(".");
}

/** Parse a user-entered amount string into a number (apostrophes/spaces
 *  stripped, comma treated as decimal separator). Empty → 0. */
export function pn(s: string | null | undefined): number {
  if (s === "" || s === null || s === undefined) return 0;
  const v = parseFloat(String(s).replace(/['’\s]/g, "").replace(",", "."));
  return Number.isNaN(v) ? 0 : v;
}
