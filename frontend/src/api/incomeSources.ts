import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";
import type {
  IncomeSource,
  IncomeSourceCreate,
  IncomeSourceListResponse,
  IncomeSourceUpdate
} from "@/api/types";

export type ListIncomeSourcesParams = {
  includeArchived?: boolean;
};

function buildIncomeSourcesQuery(params: ListIncomeSourcesParams = {}): string {
  const search = new URLSearchParams();
  search.set("include_archived", String(Boolean(params.includeArchived)));
  return search.toString();
}

export async function listIncomeSources(client: ApiClient, params: ListIncomeSourcesParams = {}): Promise<IncomeSourceListResponse> {
  const query = buildIncomeSourcesQuery(params);
  const response = await client.request(`/income-sources?${query}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "income_sources_list_failed");
  }
  return (await response.json()) as IncomeSourceListResponse;
}

export async function createIncomeSource(client: ApiClient, payload: IncomeSourceCreate): Promise<IncomeSource> {
  const response = await client.request("/income-sources", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "income_sources_create_failed");
  }
  return (await response.json()) as IncomeSource;
}

export async function getIncomeSource(client: ApiClient, incomeSourceId: string): Promise<IncomeSource> {
  const response = await client.request(`/income-sources/${incomeSourceId}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "income_sources_get_failed");
  }
  return (await response.json()) as IncomeSource;
}

export async function updateIncomeSource(
  client: ApiClient,
  incomeSourceId: string,
  payload: IncomeSourceUpdate
): Promise<IncomeSource> {
  const response = await client.request(`/income-sources/${incomeSourceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "income_sources_update_failed");
  }
  return (await response.json()) as IncomeSource;
}

export async function archiveIncomeSource(client: ApiClient, incomeSourceId: string): Promise<void> {
  const response = await client.request(`/income-sources/${incomeSourceId}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "income_sources_archive_failed");
  }
}

export async function restoreIncomeSource(client: ApiClient, incomeSourceId: string): Promise<IncomeSource> {
  return updateIncomeSource(client, incomeSourceId, { archived_at: null });
}
