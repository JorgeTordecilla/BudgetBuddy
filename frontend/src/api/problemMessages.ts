import type { ProblemDetails } from "@/api/types";

const CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch";
const ACCOUNT_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/account-archived";
const CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived";

const STATUS_FALLBACK_TITLE: Record<number, string> = {
  400: "Invalid request",
  403: "Forbidden",
  406: "Client contract error",
  409: "Conflict"
};

export function mapTransactionProblem(problem: ProblemDetails | null, status: number, fallbackTitle: string): ProblemDetails {
  const normalized: ProblemDetails = problem ?? {
    type: "about:blank",
    title: STATUS_FALLBACK_TITLE[status] ?? fallbackTitle,
    status
  };

  if (normalized.type === CATEGORY_TYPE_MISMATCH_TYPE) {
    return {
      ...normalized,
      title: normalized.title || "Category type mismatch",
      detail: "Transaction type must match category type."
    };
  }

  if (normalized.type === ACCOUNT_ARCHIVED_TYPE) {
    return {
      ...normalized,
      detail: normalized.detail ?? "Transactions cannot be created on archived accounts."
    };
  }

  if (normalized.type === CATEGORY_ARCHIVED_TYPE) {
    return {
      ...normalized,
      detail: normalized.detail ?? "Transactions cannot use archived categories."
    };
  }

  return {
    ...normalized,
    title: normalized.title || STATUS_FALLBACK_TITLE[normalized.status] || fallbackTitle
  };
}
