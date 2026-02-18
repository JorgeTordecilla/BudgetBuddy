from app.core.errors import APIError

ACCOUNT_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/account-archived"
ACCOUNT_ARCHIVED_TITLE = "Account is archived"
ACCOUNT_ARCHIVED_STATUS = 409


def account_archived_error(detail: str | None = None) -> APIError:
    return APIError(
        status=ACCOUNT_ARCHIVED_STATUS,
        title=ACCOUNT_ARCHIVED_TITLE,
        detail=detail,
        type_=ACCOUNT_ARCHIVED_TYPE,
    )
