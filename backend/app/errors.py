from app.core.errors import APIError

UNAUTHORIZED_TYPE = "https://api.budgetbuddy.dev/problems/unauthorized"
UNAUTHORIZED_TITLE = "Unauthorized"
UNAUTHORIZED_STATUS = 401

FORBIDDEN_TYPE = "https://api.budgetbuddy.dev/problems/forbidden"
FORBIDDEN_TITLE = "Forbidden"
FORBIDDEN_STATUS = 403

NOT_ACCEPTABLE_TYPE = "https://api.budgetbuddy.dev/problems/not-acceptable"
NOT_ACCEPTABLE_TITLE = "Not Acceptable"
NOT_ACCEPTABLE_STATUS = 406

INVALID_CURSOR_TYPE = "https://api.budgetbuddy.dev/problems/invalid-cursor"
INVALID_CURSOR_TITLE = "Invalid cursor"
INVALID_CURSOR_STATUS = 400

INVALID_DATE_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/invalid-date-range"
INVALID_DATE_RANGE_TITLE = "Invalid date range"
INVALID_DATE_RANGE_STATUS = 400

REFRESH_REVOKED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-revoked"
REFRESH_REVOKED_TITLE = "Refresh token revoked"
REFRESH_REVOKED_STATUS = 403

REFRESH_REUSE_DETECTED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-reuse-detected"
REFRESH_REUSE_DETECTED_TITLE = "Refresh token reuse detected"
ORIGIN_NOT_ALLOWED_TYPE = "https://api.budgetbuddy.dev/problems/origin-not-allowed"
ORIGIN_NOT_ALLOWED_TITLE = "Forbidden"

ACCOUNT_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/account-archived"
ACCOUNT_ARCHIVED_TITLE = "Account is archived"
ACCOUNT_ARCHIVED_STATUS = 409

CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived"
CATEGORY_ARCHIVED_TITLE = "Category is archived"
CATEGORY_ARCHIVED_STATUS = 409

CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch"
CATEGORY_TYPE_MISMATCH_TITLE = "Category type mismatch"
CATEGORY_TYPE_MISMATCH_STATUS = 409

BUDGET_DUPLICATE_TYPE = "https://api.budgetbuddy.dev/problems/budget-duplicate"
BUDGET_DUPLICATE_TITLE = "Budget already exists"
BUDGET_DUPLICATE_STATUS = 409

CATEGORY_NOT_OWNED_TYPE = "https://api.budgetbuddy.dev/problems/category-not-owned"
CATEGORY_NOT_OWNED_TITLE = "Category is not owned by authenticated user"
CATEGORY_NOT_OWNED_STATUS = 409

BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid"
BUDGET_MONTH_INVALID_TITLE = "Budget month format is invalid"
BUDGET_MONTH_INVALID_STATUS = 400

MONEY_AMOUNT_NOT_INTEGER_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-not-integer"
MONEY_AMOUNT_NOT_INTEGER_TITLE = "Money amount must be an integer"
MONEY_AMOUNT_NOT_INTEGER_STATUS = 400

MONEY_AMOUNT_OUT_OF_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-out-of-range"
MONEY_AMOUNT_OUT_OF_RANGE_TITLE = "Money amount is out of safe range"
MONEY_AMOUNT_OUT_OF_RANGE_STATUS = 400

MONEY_AMOUNT_SIGN_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-sign-invalid"
MONEY_AMOUNT_SIGN_INVALID_TITLE = "Money amount sign is invalid"
MONEY_AMOUNT_SIGN_INVALID_STATUS = 400

MONEY_CURRENCY_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/money-currency-mismatch"
MONEY_CURRENCY_MISMATCH_TITLE = "Money currency mismatch"
MONEY_CURRENCY_MISMATCH_STATUS = 400

IMPORT_BATCH_LIMIT_EXCEEDED_TYPE = "https://api.budgetbuddy.dev/problems/import-batch-limit-exceeded"
IMPORT_BATCH_LIMIT_EXCEEDED_TITLE = "Import batch limit exceeded"
IMPORT_BATCH_LIMIT_EXCEEDED_STATUS = 400

RATE_LIMITED_TYPE = "https://api.budgetbuddy.dev/problems/rate-limited"
RATE_LIMITED_TITLE = "Too Many Requests"
RATE_LIMITED_STATUS = 429

SERVICE_UNAVAILABLE_TYPE = "https://api.budgetbuddy.dev/problems/service-unavailable"
SERVICE_UNAVAILABLE_TITLE = "Service Unavailable"
SERVICE_UNAVAILABLE_STATUS = 503


def unauthorized_error(detail: str | None = None) -> APIError:
    return APIError(
        status=UNAUTHORIZED_STATUS,
        title=UNAUTHORIZED_TITLE,
        detail=detail,
        type_=UNAUTHORIZED_TYPE,
    )


def forbidden_error(detail: str | None = None) -> APIError:
    return APIError(
        status=FORBIDDEN_STATUS,
        title=FORBIDDEN_TITLE,
        detail=detail,
        type_=FORBIDDEN_TYPE,
    )


def not_acceptable_error(detail: str | None = None) -> APIError:
    return APIError(
        status=NOT_ACCEPTABLE_STATUS,
        title=NOT_ACCEPTABLE_TITLE,
        detail=detail,
        type_=NOT_ACCEPTABLE_TYPE,
    )


def invalid_cursor_error(detail: str | None = None) -> APIError:
    return APIError(
        status=INVALID_CURSOR_STATUS,
        title=INVALID_CURSOR_TITLE,
        detail=detail,
        type_=INVALID_CURSOR_TYPE,
    )


def invalid_date_range_error(detail: str | None = None) -> APIError:
    return APIError(
        status=INVALID_DATE_RANGE_STATUS,
        title=INVALID_DATE_RANGE_TITLE,
        detail=detail,
        type_=INVALID_DATE_RANGE_TYPE,
    )


def refresh_revoked_error(detail: str | None = None) -> APIError:
    return APIError(
        status=REFRESH_REVOKED_STATUS,
        title=REFRESH_REVOKED_TITLE,
        detail=detail,
        type_=REFRESH_REVOKED_TYPE,
    )


def refresh_reuse_detected_error(detail: str | None = None) -> APIError:
    return APIError(
        status=REFRESH_REVOKED_STATUS,
        title=REFRESH_REUSE_DETECTED_TITLE,
        detail=detail,
        type_=REFRESH_REUSE_DETECTED_TYPE,
    )


def origin_not_allowed_error(detail: str | None = None) -> APIError:
    return APIError(
        status=FORBIDDEN_STATUS,
        title=ORIGIN_NOT_ALLOWED_TITLE,
        detail=detail,
        type_=ORIGIN_NOT_ALLOWED_TYPE,
    )


def account_archived_error(detail: str | None = None) -> APIError:
    return APIError(
        status=ACCOUNT_ARCHIVED_STATUS,
        title=ACCOUNT_ARCHIVED_TITLE,
        detail=detail,
        type_=ACCOUNT_ARCHIVED_TYPE,
    )


def category_archived_error(detail: str | None = None) -> APIError:
    return APIError(
        status=CATEGORY_ARCHIVED_STATUS,
        title=CATEGORY_ARCHIVED_TITLE,
        detail=detail,
        type_=CATEGORY_ARCHIVED_TYPE,
    )


def category_type_mismatch_error(detail: str | None = None) -> APIError:
    return APIError(
        status=CATEGORY_TYPE_MISMATCH_STATUS,
        title=CATEGORY_TYPE_MISMATCH_TITLE,
        detail=detail,
        type_=CATEGORY_TYPE_MISMATCH_TYPE,
    )


def budget_duplicate_error(detail: str | None = None) -> APIError:
    return APIError(
        status=BUDGET_DUPLICATE_STATUS,
        title=BUDGET_DUPLICATE_TITLE,
        detail=detail,
        type_=BUDGET_DUPLICATE_TYPE,
    )


def category_not_owned_error(detail: str | None = None) -> APIError:
    return APIError(
        status=CATEGORY_NOT_OWNED_STATUS,
        title=CATEGORY_NOT_OWNED_TITLE,
        detail=detail,
        type_=CATEGORY_NOT_OWNED_TYPE,
    )


def budget_month_invalid_error(detail: str | None = None) -> APIError:
    return APIError(
        status=BUDGET_MONTH_INVALID_STATUS,
        title=BUDGET_MONTH_INVALID_TITLE,
        detail=detail,
        type_=BUDGET_MONTH_INVALID_TYPE,
    )


def money_amount_not_integer_error(detail: str | None = None) -> APIError:
    return APIError(
        status=MONEY_AMOUNT_NOT_INTEGER_STATUS,
        title=MONEY_AMOUNT_NOT_INTEGER_TITLE,
        detail=detail,
        type_=MONEY_AMOUNT_NOT_INTEGER_TYPE,
    )


def money_amount_out_of_range_error(detail: str | None = None) -> APIError:
    return APIError(
        status=MONEY_AMOUNT_OUT_OF_RANGE_STATUS,
        title=MONEY_AMOUNT_OUT_OF_RANGE_TITLE,
        detail=detail,
        type_=MONEY_AMOUNT_OUT_OF_RANGE_TYPE,
    )


def money_amount_sign_invalid_error(detail: str | None = None) -> APIError:
    return APIError(
        status=MONEY_AMOUNT_SIGN_INVALID_STATUS,
        title=MONEY_AMOUNT_SIGN_INVALID_TITLE,
        detail=detail,
        type_=MONEY_AMOUNT_SIGN_INVALID_TYPE,
    )


def money_currency_mismatch_error(detail: str | None = None) -> APIError:
    return APIError(
        status=MONEY_CURRENCY_MISMATCH_STATUS,
        title=MONEY_CURRENCY_MISMATCH_TITLE,
        detail=detail,
        type_=MONEY_CURRENCY_MISMATCH_TYPE,
    )


def import_batch_limit_exceeded_error(detail: str | None = None) -> APIError:
    return APIError(
        status=IMPORT_BATCH_LIMIT_EXCEEDED_STATUS,
        title=IMPORT_BATCH_LIMIT_EXCEEDED_TITLE,
        detail=detail,
        type_=IMPORT_BATCH_LIMIT_EXCEEDED_TYPE,
    )


def rate_limited_error(detail: str | None = None, retry_after: int | None = None) -> APIError:
    headers = {"Retry-After": str(retry_after)} if retry_after is not None else None
    return APIError(
        status=RATE_LIMITED_STATUS,
        title=RATE_LIMITED_TITLE,
        detail=detail,
        type_=RATE_LIMITED_TYPE,
        headers=headers,
    )


def service_unavailable_error(detail: str | None = None) -> APIError:
    return APIError(
        status=SERVICE_UNAVAILABLE_STATUS,
        title=SERVICE_UNAVAILABLE_TITLE,
        detail=detail,
        type_=SERVICE_UNAVAILABLE_TYPE,
    )
