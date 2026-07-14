import { describe, it, expect } from "vitest";
import { fmt, pn, fmtInput, isNumeric } from "./format";

describe("fmt", () => {
  it("groups thousands with apostrophes and 2 decimals", () => expect(fmt(1234567)).toBe("1'234'567.00"));
  it("uses the unicode minus for negatives", () => expect(fmt(-250)).toBe("−250.00"));
  it("renders a dash for null/NaN", () => {
    expect(fmt(null)).toBe("–");
    expect(fmt(undefined)).toBe("–");
    expect(fmt(NaN)).toBe("–");
  });
  it("renders a dash for ~0 when dashZero", () => {
    expect(fmt(0, true)).toBe("–");
    expect(fmt(0)).toBe("0.00");
  });
  it("always shows two decimals", () => {
    expect(fmt(1234.5)).toBe("1'234.50");
    expect(fmt(1489000)).toBe("1'489'000.00");
  });
});

describe("pn", () => {
  it("strips apostrophes", () => expect(pn("1'234")).toBe(1234));
  it("treats comma as a decimal separator", () => expect(pn("1,5")).toBe(1.5));
  it("accepts the unicode minus", () => expect(pn("−250")).toBe(-250));
  it("returns 0 for empty/garbage", () => {
    expect(pn("")).toBe(0);
    expect(pn("abc")).toBe(0);
    expect(pn(null)).toBe(0);
  });
});

describe("isNumeric", () => {
  it("accepts valid amounts", () => {
    expect(isNumeric("1'234")).toBe(true);
    expect(isNumeric("-250")).toBe(true);
    expect(isNumeric("1,5")).toBe(true);
    expect(isNumeric("−9")).toBe(true);
  });
  it("rejects invalid amounts", () => {
    expect(isNumeric("abc")).toBe(false);
    expect(isNumeric("1.")).toBe(false);
    expect(isNumeric("")).toBe(false);
    expect(isNumeric("-")).toBe(false);
  });
});

describe("fmtInput", () => {
  it("groups, ASCII minus, always 2 decimals", () => expect(fmtInput("-1234")).toBe("-1'234.00"));
  it("pads/rounds to 2 decimals", () => {
    expect(fmtInput("1234.5")).toBe("1'234.50");
    expect(fmtInput("16000")).toBe("16'000.00");
  });
  it("returns empty for empty / lone minus", () => {
    expect(fmtInput("")).toBe("");
    expect(fmtInput("-")).toBe("");
  });
  it("round-trips through pn()", () => {
    expect(pn(fmtInput("-12345.6"))).toBe(-12345.6);
    expect(pn(fmtInput("1'000"))).toBe(1000);
  });
});
