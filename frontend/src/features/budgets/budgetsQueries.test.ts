import { describe, expect, it, vi } from "vitest";

import { budgetsKeys, invalidateBudgetCaches } from "@/features/budgets/budgetsQueries";

describe("budgets query keys", () => {
  it("builds normalized list and detail keys", () => {
    expect(budgetsKeys.list({ from: "2026-01", to: "2026-03" })).toEqual([
      "budgets",
      "list",
      { from: "2026-01", to: "2026-03" }
    ]);
    expect(budgetsKeys.detail("b1")).toEqual(["budgets", "detail", "b1"]);
  });
});

describe("invalidateBudgetCaches", () => {
  it("invalidates budgets and analytics keys", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as never;

    await invalidateBudgetCaches(queryClient, "b1");

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["budgets"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["budgets", "detail", "b1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });

  it("skips detail invalidation when budget id is not provided", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as never;

    await invalidateBudgetCaches(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["budgets"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["analytics"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["budgets", "detail", expect.any(String)] });
  });
});
