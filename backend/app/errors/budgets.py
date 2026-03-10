from app.errors._helpers import make_api_error

BUDGET_DUPLICATE_TYPE = "https://api.budgetbuddy.dev/problems/budget-duplicate"
BUDGET_DUPLICATE_TITLE = "Budget already exists"
BUDGET_DUPLICATE_STATUS = 409

CATEGORY_NOT_OWNED_TYPE = "https://api.budgetbuddy.dev/problems/category-not-owned"
CATEGORY_NOT_OWNED_TITLE = "Category is not owned by authenticated user"
CATEGORY_NOT_OWNED_STATUS = 409

BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid"
BUDGET_MONTH_INVALID_TITLE = "Budget month format is invalid"
BUDGET_MONTH_INVALID_STATUS = 400

ROLLOVER_ALREADY_APPLIED_TYPE = "https://api.budgetbuddy.dev/problems/rollover-already-applied"
ROLLOVER_ALREADY_APPLIED_TITLE = "Rollover already applied"
ROLLOVER_ALREADY_APPLIED_STATUS = 409

ROLLOVER_NO_SURPLUS_TYPE = "https://api.budgetbuddy.dev/problems/rollover-no-surplus"
ROLLOVER_NO_SURPLUS_TITLE = "Rollover has no surplus"
ROLLOVER_NO_SURPLUS_STATUS = 422


def budget_duplicate_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=BUDGET_DUPLICATE_STATUS,
        title=BUDGET_DUPLICATE_TITLE,
        detail=detail,
        type_=BUDGET_DUPLICATE_TYPE,
    )


def category_not_owned_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=CATEGORY_NOT_OWNED_STATUS,
        title=CATEGORY_NOT_OWNED_TITLE,
        detail=detail,
        type_=CATEGORY_NOT_OWNED_TYPE,
    )


def budget_month_invalid_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=BUDGET_MONTH_INVALID_STATUS,
        title=BUDGET_MONTH_INVALID_TITLE,
        detail=detail,
        type_=BUDGET_MONTH_INVALID_TYPE,
    )


def rollover_already_applied_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=ROLLOVER_ALREADY_APPLIED_STATUS,
        title=ROLLOVER_ALREADY_APPLIED_TITLE,
        detail=detail,
        type_=ROLLOVER_ALREADY_APPLIED_TYPE,
    )


def rollover_no_surplus_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=ROLLOVER_NO_SURPLUS_STATUS,
        title=ROLLOVER_NO_SURPLUS_TITLE,
        detail=detail,
        type_=ROLLOVER_NO_SURPLUS_TYPE,
    )
