import { useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { getBudget, listBudgets } from "@/api/budgets";
import type { ApiClient } from "@/api/client";

type BudgetsRange = {
  from: string;
  to: string;
};

export const budgetsKeys = {
  all: ["budgets"] as const,
  list: (range: BudgetsRange) => ["budgets", "list", { from: range.from, to: range.to }] as const,
  detail: (budgetId: string) => ["budgets", "detail", budgetId] as const
};

export function useBudgetsList(apiClient: ApiClient, range: BudgetsRange, enabled: boolean) {
  return useQuery({
    queryKey: budgetsKeys.list(range),
    enabled,
    queryFn: () => listBudgets(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useBudgetDetail(apiClient: ApiClient, budgetId: string, enabled: boolean) {
  return useQuery({
    queryKey: budgetsKeys.detail(budgetId),
    enabled,
    queryFn: () => getBudget(apiClient, budgetId)
  });
}

export async function invalidateBudgetCaches(queryClient: QueryClient, budgetId?: string) {
  await queryClient.invalidateQueries({ queryKey: budgetsKeys.all });
  if (budgetId) {
    await queryClient.invalidateQueries({ queryKey: budgetsKeys.detail(budgetId) });
  }
  await queryClient.invalidateQueries({ queryKey: ["analytics"] });
}
