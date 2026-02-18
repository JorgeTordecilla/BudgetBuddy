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

ACCOUNT_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/account-archived"
ACCOUNT_ARCHIVED_TITLE = "Account is archived"
ACCOUNT_ARCHIVED_STATUS = 409

CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived"
CATEGORY_ARCHIVED_TITLE = "Category is archived"
CATEGORY_ARCHIVED_STATUS = 409

CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch"
CATEGORY_TYPE_MISMATCH_TITLE = "Category type mismatch"
CATEGORY_TYPE_MISMATCH_STATUS = 409


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
