import type { ApiClient } from "@/api/client";
import { readProblemDetails } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import type {
  Transaction,
  TransactionCreate,
  TransactionImportRequest,
  TransactionImportResult,
  TransactionsListResponse,
  TransactionType,
  TransactionUpdate
} from "@/api/types";

export type ListTransactionsParams = {
  includeArchived?: boolean;
  type?: TransactionType | "all";
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
};

function buildTransactionsQuery(params: ListTransactionsParams = {}): string {
  const search = new URLSearchParams();
  search.set("include_archived", String(Boolean(params.includeArchived)));
  if (params.type && params.type !== "all") {
    search.set("type", params.type);
  }
  if (params.accountId) {
    search.set("account_id", params.accountId);
  }
  if (params.categoryId) {
    search.set("category_id", params.categoryId);
  }
  if (params.from) {
    search.set("from", params.from);
  }
  if (params.to) {
    search.set("to", params.to);
  }
  if (params.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params.limit && params.limit > 0) {
    search.set("limit", String(params.limit));
  }
  return search.toString();
}

export async function listTransactions(client: ApiClient, params: ListTransactionsParams = {}): Promise<TransactionsListResponse> {
  const query = buildTransactionsQuery(params);
  const response = await client.request(`/transactions?${query}`, { method: "GET" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "transactions_list_failed");
  }
  return (await response.json()) as TransactionsListResponse;
}

export async function createTransaction(client: ApiClient, payload: TransactionCreate): Promise<Transaction> {
  const response = await client.request("/transactions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "transactions_create_failed");
  }
  return (await response.json()) as Transaction;
}

export async function updateTransaction(client: ApiClient, transactionId: string, payload: TransactionUpdate): Promise<Transaction> {
  const response = await client.request(`/transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "transactions_update_failed");
  }
  return (await response.json()) as Transaction;
}

export async function archiveTransaction(client: ApiClient, transactionId: string): Promise<void> {
  const response = await client.request(`/transactions/${transactionId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "transactions_archive_failed");
  }
}

export async function restoreTransaction(client: ApiClient, transactionId: string): Promise<Transaction> {
  return updateTransaction(client, transactionId, { archived_at: null });
}

export async function importTransactions(client: ApiClient, payload: TransactionImportRequest): Promise<TransactionImportResult> {
  const response = await client.request("/transactions/import", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new ApiProblemError(response.status, await readProblemDetails(response), "transactions_import_failed");
  }
  return (await response.json()) as TransactionImportResult;
}
