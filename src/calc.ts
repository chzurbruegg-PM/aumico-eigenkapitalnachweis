import type { Col, Period } from "./types";
import { pn } from "./format";

/** A column that holds values (everything except a total column). */
export const isVal = (c: Col) => c.type !== "total";

export const near0 = (x: number) => Math.abs(x) < 0.005;

/** Opening balance of a column for a period: system columns come from the
 *  account mapping, non-system (user-added) columns from the manual input. */
export const colOpen = (p: Period, c: Col): number =>
  c.system ? p.sysOpen[c.id] || 0 : pn(p.manOpen[c.id] || "");

/**
 * Sum `getv` over the value columns a total column includes.
 * A total's `sources` lists the value-column ids it sums; when absent (legacy),
 * it sums every value column. Total columns are never summed into other totals.
 */
export function sumForTotal(total: Col, cols: Col[], getv: (c: Col) => number): number {
  const src = total.sources;
  let s = 0;
  for (const cc of cols) {
    if (cc.type === "total") continue;
    if (!src || src.includes(cc.id)) s += getv(cc);
  }
  return s;
}

/**
 * Return a NEW array with the item at index `from` moved so it lands immediately
 * before the original index `beforeIdx` (`beforeIdx === length` appends at the
 * end). No-op when the item would keep its place. Out-of-range `from` → a copy.
 */
export function reinsert<T>(arr: T[], from: number, beforeIdx: number): T[] {
  if (from < 0 || from >= arr.length) return arr.slice();
  const next = arr.slice();
  const [m] = next.splice(from, 1);
  let at = from < beforeIdx ? beforeIdx - 1 : beforeIdx;
  if (at < 0) at = 0;
  if (at > next.length) at = next.length;
  next.splice(at, 0, m);
  return next;
}
