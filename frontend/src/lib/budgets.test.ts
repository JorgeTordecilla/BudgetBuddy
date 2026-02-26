import { describe, expect, it } from "vitest";

import {
  centsToDecimalInput,
  isValidMonth,
  isValidMonthRange,
  parseLimitInputToCents
} from "@/lib/budgets";

describe("budget helpers", () => {
  it("validates month format and range ordering", () => {
    expect(isValidMonth("2026-02")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonthRange("2026-01", "2026-03")).toBe(true);
    expect(isValidMonthRange("2026-03", "2026-01")).toBe(false);
    expect(isValidMonthRange("2026-03", "bad")).toBe(false);
  });

  it("converts decimal budget limit input to cents", () => {
    expect(parseLimitInputToCents("12")).toBe(1200);
    expect(parseLimitInputToCents("12.3")).toBe(1230);
    expect(parseLimitInputToCents("12.34")).toBe(1234);
    expect(parseLimitInputToCents("0")).toBeNull();
    expect(parseLimitInputToCents("-1")).toBeNull();
    expect(parseLimitInputToCents("1.999")).toBeNull();
    expect(parseLimitInputToCents("10000000000.00")).toBeNull();
  });

  it("formats cents back to decimal input", () => {
    expect(centsToDecimalInput(1234)).toBe("12.34");
  });
});
