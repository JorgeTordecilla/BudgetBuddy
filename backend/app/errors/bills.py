from app.errors._helpers import make_api_error

BILL_CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/bill-category-type-mismatch"
BILL_CATEGORY_TYPE_MISMATCH_TITLE = "Bill category must be of type expense"
BILL_CATEGORY_TYPE_MISMATCH_STATUS = 409

BILL_DUE_DAY_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/bill-due-day-invalid"
BILL_DUE_DAY_INVALID_TITLE = "Bill due day must be between 1 and 31"
BILL_DUE_DAY_INVALID_STATUS = 422

BILL_ALREADY_PAID_TYPE = "https://api.budgetbuddy.dev/problems/bill-already-paid"
BILL_ALREADY_PAID_TITLE = "Bill already paid for this month"
BILL_ALREADY_PAID_STATUS = 409

BILL_INACTIVE_FOR_MONTH_TYPE = "https://api.budgetbuddy.dev/problems/bill-inactive-for-month"
BILL_INACTIVE_FOR_MONTH_TITLE = "Bill is inactive for this month"
BILL_INACTIVE_FOR_MONTH_STATUS = 409


def bill_category_type_mismatch_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=BILL_CATEGORY_TYPE_MISMATCH_STATUS,
        title=BILL_CATEGORY_TYPE_MISMATCH_TITLE,
        detail=detail,
        type_=BILL_CATEGORY_TYPE_MISMATCH_TYPE,
    )


def bill_due_day_invalid_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=BILL_DUE_DAY_INVALID_STATUS,
        title=BILL_DUE_DAY_INVALID_TITLE,
        detail=detail,
        type_=BILL_DUE_DAY_INVALID_TYPE,
    )


def bill_already_paid_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=BILL_ALREADY_PAID_STATUS,
        title=BILL_ALREADY_PAID_TITLE,
        detail=detail,
        type_=BILL_ALREADY_PAID_TYPE,
    )


def bill_inactive_for_month_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=BILL_INACTIVE_FOR_MONTH_STATUS,
        title=BILL_INACTIVE_FOR_MONTH_TITLE,
        detail=detail,
        type_=BILL_INACTIVE_FOR_MONTH_TYPE,
    )
