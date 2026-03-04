import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAnalyticsByCategory, getAnalyticsByMonth, getAnalyticsIncome } from "@/api/analytics";
import { applyRollover, getRolloverPreview } from "@/api/rollover";
import type { ApiClient } from "@/api/client";
import type { RolloverApplyRequest } from "@/api/types";

type AnalyticsRange = {
  from: string;
  to: string;
};

export function useAnalyticsByMonth(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "by-month", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getAnalyticsByMonth(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useAnalyticsByCategory(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "by-category", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getAnalyticsByCategory(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useAnalyticsIncome(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "income", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getAnalyticsIncome(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useRolloverPreview(apiClient: ApiClient, month: string, enabled: boolean) {
  return useQuery({
    queryKey: ["rollover", "preview", { month }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getRolloverPreview(apiClient, month),
    placeholderData: (previous) => previous
  });
}

export function useApplyRollover(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RolloverApplyRequest) => applyRollover(apiClient, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["rollover"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    }
  });
}
