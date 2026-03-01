import { useQuery } from "@tanstack/react-query";

import { getAnalyticsByCategory, getAnalyticsByMonth } from "@/api/analytics";
import { listTransactions } from "@/api/transactions";
import type { ApiClient } from "@/api/client";
import type { AnalyticsByCategoryItem, AnalyticsByMonthItem, Transaction } from "@/api/types";
import { currentIsoMonth } from "@/utils/dates";

export type DashboardMonthRange = {
  month: string;
  from: string;
  to: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthToDateRange(month: string): DashboardMonthRange {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const monthPart = pad2(monthIndex + 1);
  const endDay = daysInMonth(year, monthIndex);
  return {
    month,
    from: `${year}-${monthPart}-01`,
    to: `${year}-${monthPart}-${pad2(endDay)}`
  };
}

function monthStartFromMonth(month: string): string {
  return `${month}-01`;
}

function monthEndFromMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  return `${year}-${pad2(monthIndex + 1)}-${pad2(daysInMonth(year, monthIndex))}`;
}

export function currentLocalMonth(): string {
  return currentIsoMonth();
}

export function recentMonths(maxMonths = 6): string[] {
  const base = new Date();
  const items: string[] = [];
  for (let index = 0; index < maxMonths; index += 1) {
    const value = new Date(base.getFullYear(), base.getMonth() - index, 1);
    items.push(currentIsoMonth(value));
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
  const fromMonth = orderedMonths[0] ?? currentLocalMonth();
  const toMonth = orderedMonths[orderedMonths.length - 1] ?? currentLocalMonth();
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
