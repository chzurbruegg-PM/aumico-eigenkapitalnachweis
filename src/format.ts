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

/** Normalise a user-entered amount: strip apostrophes/spaces, map the unicode
 *  minus (−) to ASCII, and comma → dot. */
function normalizeAmount(s: string): string {
  return String(s).replace(/['’\s]/g, "").replace(/−/g, "-").replace(",", ".");
}

/** Parse a user-entered amount string into a number. Empty/garbage → 0. */
export function pn(s: string | null | undefined): number {
  if (s === "" || s === null || s === undefined) return 0;
  const v = parseFloat(normalizeAmount(String(s)));
  return Number.isNaN(v) ? 0 : v;
}

/** True if a non-empty input parses to a finite number. */
export function isNumeric(raw: string): boolean {
  const c = normalizeAmount(raw.trim());
  return c !== "" && c !== "-" && /^-?\d*\.?\d+$/.test(c);
}

/** Format a user-entered amount for display INSIDE an input: apostrophe
 *  grouping with an ASCII "-" for negatives so `pn()` round-trips exactly.
 *  Empty / "-" → "". Invalid input is returned unchanged. */
export function fmtInput(raw: string): string {
  const c = normalizeAmount(raw.trim());
  if (c === "" || c === "-") return "";
  const neg = c.startsWith("-");
  const abs = neg ? c.slice(1) : c;
  if (!/^\d*\.?\d+$/.test(abs)) return raw;
  const [i = "0", f] = abs.split(".");
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "-" : "") + grouped + (f !== undefined ? "." + f : "");
}
