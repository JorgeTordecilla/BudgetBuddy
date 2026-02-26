import { describe, expect, it } from "vitest";

import { budgetUsagePercent, centsToDecimalString, formatCents } from "@/utils/money";

describe("money helpers", () => {
  it("formats cents into currency string", () => {
    expect(formatCents("USD", 12345)).toContain("123.45");
  });

  it("converts cents to decimal string", () => {
    expect(centsToDecimalString(12345)).toBe("123.45");
  });

  it("computes budget usage and handles zero limits", () => {
    expect(budgetUsagePercent(50, 100)).toBe(50);
    expect(budgetUsagePercent(100, 0)).toBeNull();
  });
});
