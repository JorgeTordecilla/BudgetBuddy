import type { ProblemDetails } from "@/api/types";

const CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch";
const ACCOUNT_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/account-archived";
const CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived";
const BUDGET_DUPLICATE_TYPE = "https://api.budgetbuddy.dev/problems/budget-duplicate";
const BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid";
const CATEGORY_NOT_OWNED_TYPE = "https://api.budgetbuddy.dev/problems/category-not-owned";
const MONEY_AMOUNT_PREFIX = "https://api.budgetbuddy.dev/problems/money-amount-";
const INVALID_DATE_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/invalid-date-range";

const STATUS_FALLBACK_TITLE: Record<number, string> = {
  400: "Invalid request",
  401: "Unauthorized",
  403: "Forbidden",
  406: "Client contract error",
  409: "Conflict",
  429: "Too Many Requests"
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

export function mapBudgetProblem(problem: ProblemDetails | null, status: number, fallbackTitle: string): ProblemDetails {
  const normalized: ProblemDetails = problem ?? {
    type: "about:blank",
    title: STATUS_FALLBACK_TITLE[status] ?? fallbackTitle,
    status
  };

  if (normalized.type === BUDGET_DUPLICATE_TYPE) {
    return {
      ...normalized,
      title: normalized.title || "Budget already exists",
      detail: "A budget already exists for that month and category."
    };
  }

  if (normalized.type === BUDGET_MONTH_INVALID_TYPE) {
    return {
      ...normalized,
      title: normalized.title || "Invalid month",
      detail: normalized.detail ?? "Month must use YYYY-MM format."
    };
  }

  if (normalized.type.startsWith(MONEY_AMOUNT_PREFIX)) {
    return {
      ...normalized,
      title: normalized.title || "Invalid limit",
      detail: normalized.detail ?? "Limit must be a positive amount with up to two decimals."
    };
  }

  if (normalized.type === CATEGORY_ARCHIVED_TYPE || normalized.type === CATEGORY_NOT_OWNED_TYPE) {
    return {
      ...normalized,
      detail: normalized.detail ?? "Selected category is not available. Choose another."
    };
  }

  return {
    ...normalized,
    title: normalized.title || STATUS_FALLBACK_TITLE[normalized.status] || fallbackTitle
  };
}

export function mapAnalyticsProblem(problem: ProblemDetails | null, status: number, fallbackTitle: string): ProblemDetails {
  const normalized: ProblemDetails = problem ?? {
    type: "about:blank",
    title: STATUS_FALLBACK_TITLE[status] ?? fallbackTitle,
    status
  };

  if (normalized.type === INVALID_DATE_RANGE_TYPE) {
    return {
      ...normalized,
      title: normalized.title || "Invalid date range",
      detail: normalized.detail ?? "The start date must be on or before the end date."
    };
  }

  return {
    ...normalized,
    title: normalized.title || STATUS_FALLBACK_TITLE[normalized.status] || fallbackTitle
  };
}
