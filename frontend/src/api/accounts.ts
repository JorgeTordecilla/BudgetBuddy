import type { ApiClient } from "@/api/client";
import { readProblemDetails } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import type { Account, AccountCreate, AccountsListResponse, AccountUpdate } from "@/api/types";

export type ListAccountsParams = {
  includeArchived?: boolean;
  cursor?: string | null;
  limit?: number;
};

function buildAccountsQuery(params: ListAccountsParams = {}): string {
  const search = new URLSearchParams();
  search.set("include_archived", String(Boolean(params.includeArchived)));
  if (params.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params.limit && params.limit > 0) {
    search.set("limit", String(params.limit));
  }
  return search.toString();
}

export async function listAccounts(client: ApiClient, params: ListAccountsParams = {}): Promise<AccountsListResponse> {
  const query = buildAccountsQuery(params);
  const response = await client.request(`/accounts?${query}`, { method: "GET" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "accounts_list_failed");
  }
  return (await response.json()) as AccountsListResponse;
}

export async function createAccount(client: ApiClient, payload: AccountCreate): Promise<Account> {
  const response = await client.request("/accounts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "accounts_create_failed");
  }
  return (await response.json()) as Account;
}

export async function updateAccount(client: ApiClient, accountId: string, payload: AccountUpdate): Promise<Account> {
  const response = await client.request(`/accounts/${accountId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "accounts_update_failed");
  }
  return (await response.json()) as Account;
}

export async function archiveAccount(client: ApiClient, accountId: string): Promise<void> {
  const response = await client.request(`/accounts/${accountId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "accounts_archive_failed");
  }
}
