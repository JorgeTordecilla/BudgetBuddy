import { useQuery } from "@tanstack/react-query";

import { getAnalyticsByCategory, getAnalyticsByMonth } from "@/api/analytics";
import { listTransactions } from "@/api/transactions";
import type { ApiClient } from "@/api/client";
import type { AnalyticsByCategoryItem, AnalyticsByMonthItem, Transaction } from "@/api/types";

export type DashboardMonthRange = {
  month: string;
  from: string;
  to: string;
};

export function monthToDateRange(month: string): DashboardMonthRange {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    month,
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10)
  };
}

function monthStartFromMonth(month: string): string {
  return `${month}-01`;
}

function monthEndFromMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return end.toISOString().slice(0, 10);
}

export function currentUtcMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function recentMonths(maxMonths = 6): string[] {
  const base = new Date();
  const items: string[] = [];
  for (let index = 0; index < maxMonths; index += 1) {
    const value = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - index, 1));
    items.push(`${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return items;
}

function resolveMonthItem(items: AnalyticsByMonthItem[], month: string): AnalyticsByMonthItem | null {
  return items.find((item) => item.month === month) ?? null;
}

export function useDashboardMonthSummary(apiClient: ApiClient, range: DashboardMonthRange) {
  return useQuery({
    queryKey: ["dashboard", "month-summary", { month: range.month, from: range.from, to: range.to }] as const,
    meta: { skipGlobalErrorToast: true },
    queryFn: async () => {
      const response = await getAnalyticsByMonth(apiClient, { from: range.from, to: range.to });
      return resolveMonthItem(response.items, range.month);
    },
    placeholderData: (previous) => previous
  });
}

export function useDashboardCategorySummary(apiClient: ApiClient, range: DashboardMonthRange) {
  return useQuery({
    queryKey: ["dashboard", "category-summary", { month: range.month, from: range.from, to: range.to }] as const,
    meta: { skipGlobalErrorToast: true },
    queryFn: async (): Promise<AnalyticsByCategoryItem[]> => {
      const response = await getAnalyticsByCategory(apiClient, { from: range.from, to: range.to });
      return response.items;
    },
    placeholderData: (previous) => previous
  });
}

export function useDashboardExpenseSample(apiClient: ApiClient, range: DashboardMonthRange) {
  return useQuery({
    queryKey: ["dashboard", "expense-sample", { month: range.month, from: range.from, to: range.to }] as const,
    meta: { skipGlobalErrorToast: true },
    queryFn: async (): Promise<Transaction[]> => {
      const response = await listTransactions(apiClient, {
        includeArchived: false,
        type: "expense",
        from: range.from,
        to: range.to,
        limit: 100
      });
      return response.items;
    },
    placeholderData: (previous) => previous
  });
}

export function useDashboardTrend(apiClient: ApiClient, months: string[]) {
  const orderedMonths = [...months].sort();
  const fromMonth = orderedMonths[0] ?? currentUtcMonth();
  const toMonth = orderedMonths[orderedMonths.length - 1] ?? currentUtcMonth();
  const from = monthStartFromMonth(fromMonth);
  const to = monthEndFromMonth(toMonth);

  return useQuery({
    queryKey: ["dashboard", "trend", { from, to, months: orderedMonths }] as const,
    meta: { skipGlobalErrorToast: true },
    queryFn: async (): Promise<AnalyticsByMonthItem[]> => {
      const response = await getAnalyticsByMonth(apiClient, { from, to });
      const map = new Map(response.items.map((item) => [item.month, item]));
      return orderedMonths.map((month) => map.get(month) ?? {
        month,
        income_total_cents: 0,
        expense_total_cents: 0,
        budget_spent_cents: 0,
        budget_limit_cents: 0
      });
    },
    placeholderData: (previous) => previous
  });
}
