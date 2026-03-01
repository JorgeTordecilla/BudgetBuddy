import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { getAnalyticsByCategory, getAnalyticsByMonth } from "@/api/analytics";
import { listTransactions } from "@/api/transactions";
import {
  currentLocalMonth,
  monthToDateRange,
  recentMonths,
  useDashboardCategorySummary,
  useDashboardExpenseSample,
  useDashboardMonthSummary,
  useDashboardTrend
} from "@/features/dashboard/queries";
import type { ApiClient } from "@/api/client";

vi.mock("@/api/analytics", () => ({
  getAnalyticsByMonth: vi.fn(),
  getAnalyticsByCategory: vi.fn()
}));

vi.mock("@/api/transactions", () => ({
  listTransactions: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("dashboard query helpers", () => {
  it("builds deterministic month ranges and recent months", () => {
    const current = currentLocalMonth();
    expect(current).toMatch(/^\d{4}-\d{2}$/);
    expect(recentMonths(6)).toHaveLength(6);

    const range = monthToDateRange("2026-02");
    expect(range).toEqual({
      month: "2026-02",
      from: "2026-02-01",
      to: "2026-02-28"
    });
  });
});

describe("dashboard query hooks", () => {
  it("loads month/category/expense summary hooks", async () => {
    vi.mocked(getAnalyticsByMonth).mockResolvedValue({
      items: [
        {
          month: "2026-02",
          income_total_cents: 1000,
          expense_total_cents: 500,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });
    vi.mocked(getAnalyticsByCategory).mockResolvedValue({
      items: [
        {
          category_id: "c1",
          category_name: "Food",
          income_total_cents: 0,
          expense_total_cents: 500,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });
    vi.mocked(listTransactions).mockResolvedValue({
      items: [
        {
          id: "t1",
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 500,
          date: "2026-02-01",
          merchant: "Store",
          note: null,
          archived_at: null,
          created_at: "",
          updated_at: ""
        }
      ],
      next_cursor: null
    });

    const range = { month: "2026-02", from: "2026-02-01", to: "2026-02-28" };
    const month = renderHook(() => useDashboardMonthSummary(apiClientStub, range), { wrapper });
    const category = renderHook(() => useDashboardCategorySummary(apiClientStub, range), { wrapper });
    const expense = renderHook(() => useDashboardExpenseSample(apiClientStub, range), { wrapper });

    await waitFor(() => expect(month.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(category.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(expense.result.current.isSuccess).toBe(true));
  });

  it("loads trend rows and fills missing months with zeroes", async () => {
    vi.mocked(getAnalyticsByMonth).mockResolvedValue({
      items: [
        {
          month: "2026-01",
          income_total_cents: 1000,
          expense_total_cents: 300,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });

    const hook = renderHook(() => useDashboardTrend(apiClientStub, ["2025-12", "2026-01"]), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data?.[0]?.month).toBe("2025-12");
    expect(hook.result.current.data?.[0]?.income_total_cents).toBe(0);
    expect(hook.result.current.data?.[1]?.month).toBe("2026-01");
  });
});
