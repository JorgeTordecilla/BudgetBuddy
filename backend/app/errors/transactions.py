from app.errors._helpers import make_api_error

ACCOUNT_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/account-archived"
ACCOUNT_ARCHIVED_TITLE = "Account is archived"
ACCOUNT_ARCHIVED_STATUS = 409

CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived"
CATEGORY_ARCHIVED_TITLE = "Category is archived"
CATEGORY_ARCHIVED_STATUS = 409

CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch"
CATEGORY_TYPE_MISMATCH_TITLE = "Category type mismatch"
CATEGORY_TYPE_MISMATCH_STATUS = 409

TRANSACTION_MOOD_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/transaction-mood-invalid"
TRANSACTION_MOOD_INVALID_TITLE = "Transaction mood value is invalid"
TRANSACTION_MOOD_INVALID_STATUS = 422

IMPORT_BATCH_LIMIT_EXCEEDED_TYPE = "https://api.budgetbuddy.dev/problems/import-batch-limit-exceeded"
IMPORT_BATCH_LIMIT_EXCEEDED_TITLE = "Import batch limit exceeded"
IMPORT_BATCH_LIMIT_EXCEEDED_STATUS = 400


def account_archived_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=ACCOUNT_ARCHIVED_STATUS,
        title=ACCOUNT_ARCHIVED_TITLE,
        detail=detail,
        type_=ACCOUNT_ARCHIVED_TYPE,
    )


def category_archived_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=CATEGORY_ARCHIVED_STATUS,
        title=CATEGORY_ARCHIVED_TITLE,
        detail=detail,
        type_=CATEGORY_ARCHIVED_TYPE,
    )


def category_type_mismatch_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=CATEGORY_TYPE_MISMATCH_STATUS,
        title=CATEGORY_TYPE_MISMATCH_TITLE,
        detail=detail,
        type_=CATEGORY_TYPE_MISMATCH_TYPE,
    )


def transaction_mood_invalid_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=TRANSACTION_MOOD_INVALID_STATUS,
        title=TRANSACTION_MOOD_INVALID_TITLE,
        detail=detail,
        type_=TRANSACTION_MOOD_INVALID_TYPE,
    )


def import_batch_limit_exceeded_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=IMPORT_BATCH_LIMIT_EXCEEDED_STATUS,
        title=IMPORT_BATCH_LIMIT_EXCEEDED_TITLE,
        detail=detail,
        type_=IMPORT_BATCH_LIMIT_EXCEEDED_TYPE,
    )
