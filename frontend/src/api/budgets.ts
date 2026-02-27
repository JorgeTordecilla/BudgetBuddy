import type { ApiClient } from "@/api/client";
import { readProblemDetails } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import type { Budget, BudgetCreate, BudgetListResponse, BudgetUpdate } from "@/api/types";

export type ListBudgetsParams = {
  from: string;
  to: string;
};

function buildBudgetsQuery(params: ListBudgetsParams): string {
  const search = new URLSearchParams();
  search.set("from", params.from);
  search.set("to", params.to);
  return search.toString();
}

export async function listBudgets(client: ApiClient, params: ListBudgetsParams): Promise<BudgetListResponse> {
  const query = buildBudgetsQuery(params);
  const response = await client.request(`/budgets?${query}`, { method: "GET" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "budgets_list_failed");
  }
  return (await response.json()) as BudgetListResponse;
}

export async function createBudget(client: ApiClient, payload: BudgetCreate): Promise<Budget> {
  const response = await client.request("/budgets", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "budgets_create_failed");
  }
  return (await response.json()) as Budget;
}

export async function getBudget(client: ApiClient, budgetId: string): Promise<Budget> {
  const response = await client.request(`/budgets/${budgetId}`, { method: "GET" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "budgets_get_failed");
  }
  return (await response.json()) as Budget;
}

export async function updateBudget(client: ApiClient, budgetId: string, payload: BudgetUpdate): Promise<Budget> {
  const response = await client.request(`/budgets/${budgetId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "budgets_update_failed");
  }
  return (await response.json()) as Budget;
}

export async function archiveBudget(client: ApiClient, budgetId: string): Promise<void> {
  const response = await client.request(`/budgets/${budgetId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "budgets_archive_failed");
  }
}
