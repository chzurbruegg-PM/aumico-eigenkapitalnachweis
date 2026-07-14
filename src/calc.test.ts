import { describe, it, expect } from "vitest";
import { isVal, colOpen, sumForTotal, reinsert, near0 } from "./calc";
import type { Col, Period } from "./types";

const val = (id: string, system = true): Col => ({ id, title: id, system, type: "value" });
const tot = (id: string, sources?: string[]): Col => ({
  id,
  title: id,
  system: true,
  type: "total",
  sources,
});

describe("isVal", () => {
  it("distinguishes value from total columns", () => {
    expect(isVal(val("c1"))).toBe(true);
    expect(isVal(tot("t"))).toBe(false);
  });
});

describe("near0", () => {
  it("treats tiny magnitudes as zero", () => {
    expect(near0(0)).toBe(true);
    expect(near0(0.004)).toBe(true);
    expect(near0(0.01)).toBe(false);
  });
});

describe("colOpen", () => {
  const p: Period = {
    id: "p",
    year: "24",
    openLabel: "",
    closeLabel: "",
    sysOpen: { c1: 100 },
    sysClose: {},
    manOpen: { c2: "1'500" },
    rows: [],
  };
  it("reads sysOpen for system columns", () => expect(colOpen(p, val("c1"))).toBe(100));
  it("parses manOpen for non-system columns", () => expect(colOpen(p, val("c2", false))).toBe(1500));
  it("defaults to 0 when missing", () => expect(colOpen(p, val("c9"))).toBe(0));
});

describe("sumForTotal", () => {
  const cols = [val("c1"), val("c2"), val("c3"), tot("t", ["c1", "c2"])];
  const vals: Record<string, number> = { c1: 10, c2: 20, c3: 30 };
  const get = (c: Col) => vals[c.id] ?? 0;

  it("sums only the listed source columns", () => {
    expect(sumForTotal(cols[3], cols, get)).toBe(30); // c1 + c2
  });
  it("sums all value columns when sources is undefined", () => {
    expect(sumForTotal(tot("t2"), cols, get)).toBe(60); // c1 + c2 + c3
  });
  it("never sums a total column into another total", () => {
    const withNested = [...cols, tot("t3", ["c1", "t"])];
    expect(sumForTotal(withNested[4], withNested, get)).toBe(10); // only c1; 't' skipped
  });
  it("reacts to source changes (config)", () => {
    expect(sumForTotal(tot("t", ["c3"]), cols, get)).toBe(30);
    expect(sumForTotal(tot("t", []), cols, get)).toBe(0);
  });
});

describe("reinsert", () => {
  it("moves an item forward", () => expect(reinsert(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "a", "d"]));
  it("moves an item backward", () => expect(reinsert(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]));
  it("is a no-op when dropped on itself", () => expect(reinsert(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]));
  it("is a no-op when beforeIdx === from + 1", () => expect(reinsert(["a", "b", "c"], 1, 2)).toEqual(["a", "b", "c"]));
  it("appends at the end", () => expect(reinsert(["a", "b", "c"], 0, 3)).toEqual(["b", "c", "a"]));
  it("returns a copy for an out-of-range index", () => expect(reinsert(["a"], 5, 0)).toEqual(["a"]));
  it("does not mutate the input", () => {
    const src = ["a", "b", "c"];
    reinsert(src, 0, 2);
    expect(src).toEqual(["a", "b", "c"]);
  });
});
