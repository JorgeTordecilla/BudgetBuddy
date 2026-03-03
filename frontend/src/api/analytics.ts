import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";
import type {
  AnalyticsByCategoryResponse,
  AnalyticsByMonthResponse,
  IncomeAnalyticsResponse
} from "@/api/types";

type AnalyticsDateRange = {
  from: string;
  to: string;
};

function buildRangeQuery({ from, to }: AnalyticsDateRange): string {
  const search = new URLSearchParams();
  search.set("from", from);
  search.set("to", to);
  return search.toString();
}

export async function getAnalyticsByMonth(client: ApiClient, params: AnalyticsDateRange): Promise<AnalyticsByMonthResponse> {
  const query = buildRangeQuery(params);
  const response = await client.request(`/analytics/by-month?${query}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "analytics_by_month_failed");
  }
  return (await response.json()) as AnalyticsByMonthResponse;
}

export async function getAnalyticsByCategory(client: ApiClient, params: AnalyticsDateRange): Promise<AnalyticsByCategoryResponse> {
  const query = buildRangeQuery(params);
  const response = await client.request(`/analytics/by-category?${query}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "analytics_by_category_failed");
  }
  return (await response.json()) as AnalyticsByCategoryResponse;
}

export async function getAnalyticsIncome(client: ApiClient, params: AnalyticsDateRange): Promise<IncomeAnalyticsResponse> {
  const query = buildRangeQuery(params);
  const response = await client.request(`/analytics/income?${query}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "analytics_income_failed");
  }
  return (await response.json()) as IncomeAnalyticsResponse;
}

export type { AnalyticsDateRange };
