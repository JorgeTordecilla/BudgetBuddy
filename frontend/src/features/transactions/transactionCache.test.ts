import { describe, expect, it, vi } from "vitest";

import {
  invalidateTransactionsAnalyticsAndBudgets,
  invalidateTransactionsAndAnalytics
} from "@/features/transactions/transactionCache";

describe("transaction cache invalidation", () => {
  it("invalidates only transactions and analytics for regular transaction flows", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as never;

    await invalidateTransactionsAndAnalytics(queryClient);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["analytics"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["budgets"] });
  });

  it("invalidates budgets in addition to transactions and analytics for import flows", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as never;

    await invalidateTransactionsAnalyticsAndBudgets(queryClient);

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["analytics"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["budgets"] });
  });
});
