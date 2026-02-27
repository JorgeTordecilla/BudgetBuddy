import type { ApiClient } from "@/api/client";
import { readProblemDetails } from "@/api/client";
import { ApiProblemError } from "@/api/errors";
import { throwApiError } from "@/api/errors";
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

export type ExportTransactionsParams = {
  type?: TransactionType | "all";
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
};

export type TransactionsCsvExportResponse = {
  blob: Blob;
  contentDisposition: string | null;
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

export function buildTransactionsExportQuery(params: ExportTransactionsParams = {}): string {
  const search = new URLSearchParams();
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
  return search.toString();
}

export async function listTransactions(client: ApiClient, params: ListTransactionsParams = {}): Promise<TransactionsListResponse> {
  const query = buildTransactionsQuery(params);
  const response = await client.request(`/transactions?${query}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "transactions_list_failed");
  }
  return (await response.json()) as TransactionsListResponse;
}

export async function createTransaction(client: ApiClient, payload: TransactionCreate): Promise<Transaction> {
  const response = await client.request("/transactions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "transactions_create_failed");
  }
  return (await response.json()) as Transaction;
}

export async function updateTransaction(client: ApiClient, transactionId: string, payload: TransactionUpdate): Promise<Transaction> {
  const response = await client.request(`/transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "transactions_update_failed");
  }
  return (await response.json()) as Transaction;
}

export async function archiveTransaction(client: ApiClient, transactionId: string): Promise<void> {
  const response = await client.request(`/transactions/${transactionId}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "transactions_archive_failed");
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
    await throwApiError(response, "transactions_import_failed");
  }
  return (await response.json()) as TransactionImportResult;
}

export async function exportTransactionsCsv(
  client: ApiClient,
  params: ExportTransactionsParams = {}
): Promise<TransactionsCsvExportResponse> {
  const query = buildTransactionsExportQuery(params);
  const response = await client.request(`/transactions/export${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      Accept: "text/csv, application/problem+json"
    }
  });
  if (!response.ok) {
    const problem = await readProblemDetails(response);
    const retryAfter = response.headers.get("Retry-After");
    const enhancedProblem = response.status === 429 && retryAfter
      ? {
          type: problem?.type ?? "https://api.budgetbuddy.dev/problems/rate-limited",
          title: problem?.title ?? "Too Many Requests",
          status: problem?.status ?? 429,
          detail: problem?.detail ?? `Too many requests. Try again in ${retryAfter} seconds.`
        }
      : problem;
    throw new ApiProblemError(
      enhancedProblem ?? { type: "about:blank", title: "transactions_export_failed", status: response.status },
      {
        httpStatus: response.status,
        requestId: response.headers.get("X-Request-Id"),
        retryAfter
      }
    );
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("content-disposition")
  };
}
