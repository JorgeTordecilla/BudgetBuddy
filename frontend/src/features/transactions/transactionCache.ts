import type { QueryClient } from "@tanstack/react-query";

export async function invalidateTransactionsAndAnalytics(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ["transactions"] });
  await queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export async function invalidateTransactionsAnalyticsAndBudgets(queryClient: QueryClient): Promise<void> {
  await invalidateTransactionsAndAnalytics(queryClient);
  await queryClient.invalidateQueries({ queryKey: ["budgets"] });
}
