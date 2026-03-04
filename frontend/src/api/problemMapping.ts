import { ApiProblemError, ApiUnknownError } from "@/api/errors";
import {
  PROBLEM_TYPE_ACCOUNT_ARCHIVED,
  PROBLEM_TYPE_BUDGET_DUPLICATE,
  PROBLEM_TYPE_BILL_ALREADY_PAID,
  PROBLEM_TYPE_BILL_CATEGORY_TYPE_MISMATCH,
  PROBLEM_TYPE_BILL_DUE_DAY_INVALID,
  PROBLEM_TYPE_BILL_INACTIVE_FOR_MONTH,
  PROBLEM_TYPE_CATEGORY_ARCHIVED,
  PROBLEM_TYPE_CATEGORY_TYPE_MISMATCH,
  PROBLEM_TYPE_FORBIDDEN,
  PROBLEM_TYPE_INVALID_CURSOR,
  PROBLEM_TYPE_INVALID_DATE_RANGE,
  PROBLEM_TYPE_NOT_ACCEPTABLE,
  PROBLEM_TYPE_RATE_LIMITED,
  PROBLEM_TYPE_ROLLOVER_ALREADY_APPLIED,
  PROBLEM_TYPE_ROLLOVER_NO_SURPLUS,
  PROBLEM_TYPE_TRANSACTION_MOOD_INVALID,
  PROBLEM_TYPE_UNAUTHORIZED
} from "@/api/problemTypes";

export type ProblemPresentation = "toast" | "inline" | "both";

type ProblemUiEntry = {
  message: string;
  presentation: ProblemPresentation;
  showDetail?: boolean;
};

const ABOUT_BLANK_TYPE = "about:blank";

const UNKNOWN_FALLBACK: ProblemUiEntry = {
  message: "Unexpected error. Please retry.",
  presentation: "toast",
  showDetail: false
};

const VALIDATION_UNKNOWN_FALLBACK: ProblemUiEntry = {
  message: "Validation failed. Check your input and try again.",
  presentation: "inline",
  showDetail: true
};

const PROBLEM_UI_MAP: Record<string, ProblemUiEntry> = {
  // Canonical auth failures: deterministic credential/access guidance.
  [PROBLEM_TYPE_UNAUTHORIZED]: {
    message: "Invalid credentials. Please try again.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_FORBIDDEN]: {
    message: "You do not have access to this resource.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_NOT_ACCEPTABLE]: {
    message: "Client contract error. Please refresh.",
    presentation: "toast"
  },
  // Canonical validation failures: inline guidance with optional safe detail.
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
  },
  [PROBLEM_TYPE_ROLLOVER_ALREADY_APPLIED]: {
    message: "Rollover for this month was already applied.",
    presentation: "inline",
    showDetail: true
  },
  [PROBLEM_TYPE_ROLLOVER_NO_SURPLUS]: {
    message: "No positive surplus available for rollover.",
    presentation: "inline",
    showDetail: true
  },
  [PROBLEM_TYPE_TRANSACTION_MOOD_INVALID]: {
    message: "Mood must be one of: happy, neutral, sad, anxious, bored.",
    presentation: "inline",
    showDetail: true
  },
  [PROBLEM_TYPE_BILL_CATEGORY_TYPE_MISMATCH]: {
    message: "Bill category must be an expense category.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_BILL_DUE_DAY_INVALID]: {
    message: "Due day must be between 1 and 28.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_BILL_ALREADY_PAID]: {
    message: "This bill is already marked as paid for the selected month.",
    presentation: "inline"
  },
  [PROBLEM_TYPE_BILL_INACTIVE_FOR_MONTH]: {
    message: "This bill is inactive for the selected month. Reactivate it first.",
    presentation: "inline"
  }
};

function isSafeActionableDetail(error: ApiProblemError): boolean {
  if (![400, 409, 422].includes(error.httpStatus)) {
    return false;
  }
  const detail = error.problem.detail?.trim();
  if (!detail) {
    return false;
  }
  // Keep auth/form validation guidance visible while filtering obvious debug dump markers.
  return !/(traceback|stack trace|exception:)/i.test(detail);
}

type ResolveProblemOptions = {
  authFlow?: "login" | "register";
};

const AUTH_CONFLICT_FALLBACK: ProblemUiEntry = {
  message: "Unable to create account with this information. Please review and try again.",
  presentation: "inline",
  showDetail: false
};

const CONFLICT_UNKNOWN_FALLBACK: ProblemUiEntry = {
  message: "Conflict detected. Review your input and try again.",
  presentation: "inline",
  showDetail: true
};

function toFriendlyValidationDetail(detail: string | undefined): string | null {
  const value = detail?.trim();
  if (!value) {
    return null;
  }

  const minLengthMatch = value.match(/string should have at least (\d+) characters/i);
  if (minLengthMatch && /password/i.test(value)) {
    return `Password must have at least ${minLengthMatch[1]} characters.`;
  }
  if (minLengthMatch && /username/i.test(value)) {
    return `Username must have at least ${minLengthMatch[1]} characters.`;
  }

  if (/\{\s*['"]type['"]\s*:/.test(value) || value.includes("'loc':")) {
    return "Please review the required fields and try again.";
  }

  return value;
}

function resolveAuthUnknownProblemFallback(error: ApiProblemError, authFlow: "login" | "register"): ProblemUiEntry {
  const detail = error.problem.detail ?? "";

  if (error.httpStatus === 400) {
    return VALIDATION_UNKNOWN_FALLBACK;
  }
  if (error.httpStatus === 401 || error.httpStatus === 403) {
    return PROBLEM_UI_MAP[PROBLEM_TYPE_UNAUTHORIZED];
  }
  if (authFlow === "register" && error.httpStatus === 409) {
    if (/username already exists/i.test(detail)) {
      return {
        message: "Username already exists. Try another one.",
        presentation: "inline",
        showDetail: false
      };
    }
    return AUTH_CONFLICT_FALLBACK;
  }

  return UNKNOWN_FALLBACK;
}

function resolveUnknownProblemFallback(error: ApiProblemError): ProblemUiEntry {
  if (error.httpStatus === 400 || error.httpStatus === 422) {
    return VALIDATION_UNKNOWN_FALLBACK;
  }
  if (error.httpStatus === 401) {
    return PROBLEM_UI_MAP[PROBLEM_TYPE_UNAUTHORIZED];
  }
  if (error.httpStatus === 403) {
    return PROBLEM_UI_MAP[PROBLEM_TYPE_FORBIDDEN];
  }
  if (error.httpStatus === 406) {
    return PROBLEM_UI_MAP[PROBLEM_TYPE_NOT_ACCEPTABLE];
  }
  if (error.httpStatus === 409) {
    return CONFLICT_UNKNOWN_FALLBACK;
  }
  return UNKNOWN_FALLBACK;
}

export type ResolvedProblemUi = {
  message: string;
  detail: string | null;
  presentation: ProblemPresentation;
  requestId: string | null;
  status: number;
  type: string;
  retryAfter: string | null;
};

export function resolveProblemUi(
  error: unknown,
  _fallbackMessage = "Unexpected error.",
  options: ResolveProblemOptions = {}
): ResolvedProblemUi {
  if (error instanceof ApiProblemError) {
    const knownMapped = PROBLEM_UI_MAP[error.problem.type];
    const mapped = knownMapped
      ?? (options.authFlow ? resolveAuthUnknownProblemFallback(error, options.authFlow) : resolveUnknownProblemFallback(error));
    const allowDetail = knownMapped ? Boolean(mapped.showDetail) : Boolean(mapped.showDetail && isSafeActionableDetail(error));
    const friendlyDetail = toFriendlyValidationDetail(error.problem.detail) ?? error.problem.detail ?? null;
    const shouldPreferDetailAsMessage = !knownMapped && !options.authFlow && error.httpStatus === 409 && allowDetail && Boolean(friendlyDetail);
    const message = shouldPreferDetailAsMessage ? friendlyDetail ?? mapped.message : mapped.message;
    const detail = shouldPreferDetailAsMessage ? null : (allowDetail ? friendlyDetail : null);
    return {
      message,
      detail,
      presentation: mapped.presentation,
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
      type: ABOUT_BLANK_TYPE,
      retryAfter: error.retryAfter
    };
  }

  return {
    message: UNKNOWN_FALLBACK.message,
    detail: null,
    presentation: UNKNOWN_FALLBACK.presentation,
    requestId: null,
    status: 0,
    type: ABOUT_BLANK_TYPE,
    retryAfter: null
  };
}
