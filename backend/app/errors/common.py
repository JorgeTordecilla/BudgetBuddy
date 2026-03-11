from app.errors._helpers import make_api_error

NOT_FOUND_TYPE = "about:blank"
NOT_FOUND_TITLE = "Not Found"
NOT_FOUND_STATUS = 404

INVALID_CURSOR_TYPE = "https://api.budgetbuddy.dev/problems/invalid-cursor"
INVALID_CURSOR_TITLE = "Invalid cursor"
INVALID_CURSOR_STATUS = 400

INVALID_DATE_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/invalid-date-range"
INVALID_DATE_RANGE_TITLE = "Invalid date range"
INVALID_DATE_RANGE_STATUS = 400


def not_found_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=NOT_FOUND_STATUS,
        title=NOT_FOUND_TITLE,
        detail=detail,
        type_=NOT_FOUND_TYPE,
    )


def invalid_cursor_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=INVALID_CURSOR_STATUS,
        title=INVALID_CURSOR_TITLE,
        detail=detail,
        type_=INVALID_CURSOR_TYPE,
    )


def invalid_date_range_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=INVALID_DATE_RANGE_STATUS,
        title=INVALID_DATE_RANGE_TITLE,
        detail=detail,
        type_=INVALID_DATE_RANGE_TYPE,
    )
