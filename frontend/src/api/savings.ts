import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";
import type {
  SavingsContribution,
  SavingsContributionCreate,
  SavingsGoal,
  SavingsGoalCreate,
  SavingsGoalDetail,
  SavingsGoalListResponse,
  SavingsGoalStatus,
  SavingsGoalUpdate,
  SavingsSummary
} from "@/api/types";

export type ListSavingsGoalsParams = {
  status?: SavingsGoalStatus | "all";
};

function buildSavingsGoalsQuery(params: ListSavingsGoalsParams = {}): string {
  const search = new URLSearchParams();
  if (params.status) {
    search.set("status", params.status);
  }
  return search.toString();
}

export async function listSavingsGoals(client: ApiClient, params: ListSavingsGoalsParams = {}): Promise<SavingsGoalListResponse> {
  const query = buildSavingsGoalsQuery(params);
  const url = query ? `/savings-goals?${query}` : "/savings-goals";
  const response = await client.request(url, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_list_failed");
  }
  return (await response.json()) as SavingsGoalListResponse;
}

export async function getSavingsGoal(client: ApiClient, goalId: string): Promise<SavingsGoalDetail> {
  const response = await client.request(`/savings-goals/${goalId}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_get_failed");
  }
  return (await response.json()) as SavingsGoalDetail;
}

export async function createSavingsGoal(client: ApiClient, payload: SavingsGoalCreate): Promise<SavingsGoal> {
  const response = await client.request("/savings-goals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_create_failed");
  }
  return (await response.json()) as SavingsGoal;
}

export async function updateSavingsGoal(client: ApiClient, goalId: string, payload: SavingsGoalUpdate): Promise<SavingsGoal> {
  const response = await client.request(`/savings-goals/${goalId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_update_failed");
  }
  return (await response.json()) as SavingsGoal;
}

export async function archiveSavingsGoal(client: ApiClient, goalId: string): Promise<void> {
  const response = await client.request(`/savings-goals/${goalId}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_archive_failed");
  }
}

export async function completeSavingsGoal(client: ApiClient, goalId: string): Promise<SavingsGoal> {
  const response = await client.request(`/savings-goals/${goalId}/complete`, { method: "POST" });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_complete_failed");
  }
  return (await response.json()) as SavingsGoal;
}

export async function cancelSavingsGoal(client: ApiClient, goalId: string): Promise<SavingsGoal> {
  const response = await client.request(`/savings-goals/${goalId}/cancel`, { method: "POST" });
  if (!response.ok) {
    await throwApiError(response, "savings_goals_cancel_failed");
  }
  return (await response.json()) as SavingsGoal;
}

export async function createSavingsContribution(client: ApiClient, goalId: string, payload: SavingsContributionCreate): Promise<SavingsContribution> {
  const response = await client.request(`/savings-goals/${goalId}/contributions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "savings_contributions_create_failed");
  }
  return (await response.json()) as SavingsContribution;
}

export async function deleteSavingsContribution(client: ApiClient, goalId: string, contributionId: string): Promise<void> {
  const response = await client.request(`/savings-goals/${goalId}/contributions/${contributionId}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "savings_contributions_delete_failed");
  }
}

export async function getSavingsSummary(client: ApiClient): Promise<SavingsSummary> {
  const response = await client.request("/savings-goals/summary", { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "savings_summary_get_failed");
  }
  return (await response.json()) as SavingsSummary;
}
