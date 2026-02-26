import { useQuery } from "@tanstack/react-query";

import { getAnalyticsByCategory, getAnalyticsByMonth } from "@/api/analytics";
import type { ApiClient } from "@/api/client";

type AnalyticsRange = {
  from: string;
  to: string;
};

export function useAnalyticsByMonth(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "by-month", { from: range.from, to: range.to }] as const,
    enabled,
    queryFn: () => getAnalyticsByMonth(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useAnalyticsByCategory(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "by-category", { from: range.from, to: range.to }] as const,
    enabled,
    queryFn: () => getAnalyticsByCategory(apiClient, range),
    placeholderData: (previous) => previous
  });
}
