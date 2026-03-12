import { describe, expect, it } from "vitest";

import {
  budgetUsagePercent,
  centsToDecimalString,
  centsToInputValue,
  formatCents,
  parseMoneyInputToCents,
  parseNonNegativeMoneyInputToCents
} from "@/utils/money";

describe("money helpers", () => {
  it("formats cents into currency string", () => {
    expect(formatCents("USD", 12345)).toContain("123.45");
  });

  it("parses major-unit money input into cents for base currencies", () => {
    expect(parseMoneyInputToCents("USD", "12.34")).toBe(1234);
    expect(parseMoneyInputToCents("COP", "4,000,000")).toBe(4000000);
    expect(parseMoneyInputToCents("EUR", "1.234,56")).toBe(123456);
    expect(parseMoneyInputToCents("MXN", "12,3")).toBe(1230);
  });

  it("rejects invalid, zero, or over-precision money input", () => {
    expect(parseMoneyInputToCents("USD", "0")).toBeNull();
    expect(parseMoneyInputToCents("USD", "-1.00")).toBeNull();
    expect(parseMoneyInputToCents("USD", "1.999")).toBeNull();
    expect(parseMoneyInputToCents("USD", "abc")).toBeNull();
  });

  it("parses non-negative money input into cents", () => {
    expect(parseNonNegativeMoneyInputToCents("USD", "0")).toBe(0);
    expect(parseNonNegativeMoneyInputToCents("USD", "0.00")).toBe(0);
    expect(parseNonNegativeMoneyInputToCents("USD", "12.34")).toBe(1234);
    expect(parseNonNegativeMoneyInputToCents("USD", "-1.00")).toBeNull();
  });

  it("converts cents to normalized form input value", () => {
    expect(centsToInputValue("USD", 1234)).toBe("12.34");
    expect(centsToInputValue("COP", 4000000)).toBe("4000000");
  });

  it("converts cents to decimal string", () => {
    expect(centsToDecimalString(12345)).toBe("123.45");
  });

  it("computes budget usage and handles zero limits", () => {
    expect(budgetUsagePercent(50, 100)).toBe(50);
    expect(budgetUsagePercent(100, 0)).toBeNull();
  });
});
