import { ApiProblemError, ApiUnknownError, type NormalizedApiError } from "@/api/errors";

export type ProblemPresentation = "toast" | "inline" | "both";

type ProblemUiEntry = {
  message: string;
  presentation: ProblemPresentation;
  showDetail?: boolean;
};

const UNKNOWN_FALLBACK: ProblemUiEntry = {
  message: "Unexpected error. Please retry.",
  presentation: "toast",
  showDetail: false
};

const PROBLEM_UI_MAP: Record<string, ProblemUiEntry> = {
  "https://api.budgetbuddy.dev/problems/unauthorized": {
    message: "Your session expired. Please sign in again.",
    presentation: "toast"
  },
  "https://api.budgetbuddy.dev/problems/forbidden": {
    message: "You do not have access to this resource.",
    presentation: "inline"
  },
  "https://api.budgetbuddy.dev/problems/not-acceptable": {
    message: "Client contract error. Please refresh.",
    presentation: "toast"
  },
  "https://api.budgetbuddy.dev/problems/invalid-cursor": {
    message: "Pagination cursor is invalid. Reload the page.",
    presentation: "inline"
  },
  "https://api.budgetbuddy.dev/problems/invalid-date-range": {
    message: "Invalid date range. 'From' must be before 'To'.",
    presentation: "inline",
    showDetail: true
  },
  "https://api.budgetbuddy.dev/problems/rate-limited": {
    message: "Too many requests. Try again in a moment.",
    presentation: "toast"
  },
  "https://api.budgetbuddy.dev/problems/account-archived": {
    message: "This account is archived. Restore it to add transactions.",
    presentation: "inline",
    showDetail: true
  },
  "https://api.budgetbuddy.dev/problems/category-archived": {
    message: "This category is archived. Restore it to use it.",
    presentation: "inline",
    showDetail: true
  },
  "https://api.budgetbuddy.dev/problems/category-type-mismatch": {
    message: "Transaction type must match category type.",
    presentation: "inline"
  },
  "https://api.budgetbuddy.dev/problems/budget-duplicate": {
    message: "A budget for this category and month already exists.",
    presentation: "inline"
  }
};

export type ResolvedProblemUi = {
  message: string;
  detail: string | null;
  presentation: ProblemPresentation;
  requestId: string | null;
  status: number;
  type: string;
  retryAfter: string | null;
};

export function resolveProblemUi(error: unknown, fallbackMessage = "Unexpected error."): ResolvedProblemUi {
  if (error instanceof ApiProblemError) {
    const mapped = PROBLEM_UI_MAP[error.problem.type];
    const message = mapped?.message ?? UNKNOWN_FALLBACK.message;
    const detail = mapped?.showDetail ? (error.problem.detail ?? null) : null;
    return {
      message,
      detail,
      presentation: mapped?.presentation ?? UNKNOWN_FALLBACK.presentation,
      requestId: error.requestId,
      status: error.httpStatus,
      type: error.problem.type,
      retryAfter: error.retryAfter
    };
  }

  if (error instanceof ApiUnknownError) {
    return {
      message: UNKNOWN_FALLBACK.message,
      detail: null,
      presentation: UNKNOWN_FALLBACK.presentation,
      requestId: error.requestId,
      status: error.httpStatus,
      type: "about:blank",
      retryAfter: error.retryAfter
    };
  }

  const unknown = error as NormalizedApiError | undefined;
  return {
    message: UNKNOWN_FALLBACK.message || unknown?.message || fallbackMessage,
    detail: null,
    presentation: UNKNOWN_FALLBACK.presentation,
    requestId: null,
    status: 0,
    type: "about:blank",
    retryAfter: null
  };
}
