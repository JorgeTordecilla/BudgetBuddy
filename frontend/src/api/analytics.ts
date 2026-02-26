import type { ApiClient } from "@/api/client";
import { readProblemDetails } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import type { AnalyticsByCategoryResponse, AnalyticsByMonthResponse } from "@/api/types";

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

function attachRetryAfter(error: ApiProblemError, response: Response): ApiProblemError {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    Object.assign(error, { retryAfter });
  }
  return error;
}

export async function getAnalyticsByMonth(client: ApiClient, params: AnalyticsDateRange): Promise<AnalyticsByMonthResponse> {
  const query = buildRangeQuery(params);
  const response = await client.request(`/analytics/by-month?${query}`, { method: "GET" });
  if (!response.ok) {
    const error = new ApiProblemError(response.status, await readProblemDetails(response), "analytics_by_month_failed");
    throw attachRetryAfter(error, response);
  }
  return (await response.json()) as AnalyticsByMonthResponse;
}

export async function getAnalyticsByCategory(client: ApiClient, params: AnalyticsDateRange): Promise<AnalyticsByCategoryResponse> {
  const query = buildRangeQuery(params);
  const response = await client.request(`/analytics/by-category?${query}`, { method: "GET" });
  if (!response.ok) {
    const error = new ApiProblemError(response.status, await readProblemDetails(response), "analytics_by_category_failed");
    throw attachRetryAfter(error, response);
  }
  return (await response.json()) as AnalyticsByCategoryResponse;
}

export type { AnalyticsDateRange };
