import { ApiProblemError, ApiUnknownError, type NormalizedApiError } from "@/api/errors";
import {
  PROBLEM_TYPE_ACCOUNT_ARCHIVED,
  PROBLEM_TYPE_BUDGET_DUPLICATE,
  PROBLEM_TYPE_CATEGORY_ARCHIVED,
  PROBLEM_TYPE_CATEGORY_TYPE_MISMATCH,
  PROBLEM_TYPE_FORBIDDEN,
  PROBLEM_TYPE_INVALID_CURSOR,
  PROBLEM_TYPE_INVALID_DATE_RANGE,
  PROBLEM_TYPE_NOT_ACCEPTABLE,
  PROBLEM_TYPE_RATE_LIMITED,
  PROBLEM_TYPE_UNAUTHORIZED
} from "@/api/problemTypes";

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
  [PROBLEM_TYPE_UNAUTHORIZED]: {
    message: "Your session expired. Please sign in again.",
    presentation: "toast"
  },
  [PROBLEM_TYPE_FORBIDDEN]: {
    message: "You do not have access to this resource.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_NOT_ACCEPTABLE]: {
    message: "Client contract error. Please refresh.",
    presentation: "toast"
  },
  [PROBLEM_TYPE_INVALID_CURSOR]: {
    message: "Pagination cursor is invalid. Reload the page.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_INVALID_DATE_RANGE]: {
    message: "Invalid date range. 'From' must be before 'To'.",
    presentation: "inline",
    showDetail: true
  },
  [PROBLEM_TYPE_RATE_LIMITED]: {
    message: "Rate limited. Try again later.",
    presentation: "toast"
  },
  [PROBLEM_TYPE_ACCOUNT_ARCHIVED]: {
    message: "This account is archived. Restore it to add transactions.",
    presentation: "inline",
    showDetail: true
  },
  [PROBLEM_TYPE_CATEGORY_ARCHIVED]: {
    message: "This category is archived. Restore it to use it.",
    presentation: "inline",
    showDetail: true
  },
  [PROBLEM_TYPE_CATEGORY_TYPE_MISMATCH]: {
    message: "Transaction type must match category type.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_BUDGET_DUPLICATE]: {
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
