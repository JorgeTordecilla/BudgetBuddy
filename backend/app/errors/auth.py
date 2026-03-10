from app.errors._helpers import make_api_error

UNAUTHORIZED_TYPE = "https://api.budgetbuddy.dev/problems/unauthorized"
UNAUTHORIZED_TITLE = "Unauthorized"
UNAUTHORIZED_STATUS = 401

FORBIDDEN_TYPE = "https://api.budgetbuddy.dev/problems/forbidden"
FORBIDDEN_TITLE = "Forbidden"
FORBIDDEN_STATUS = 403

NOT_ACCEPTABLE_TYPE = "https://api.budgetbuddy.dev/problems/not-acceptable"
NOT_ACCEPTABLE_TITLE = "Not Acceptable"
NOT_ACCEPTABLE_STATUS = 406

REFRESH_REVOKED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-revoked"
REFRESH_REVOKED_TITLE = "Refresh token revoked"
REFRESH_REVOKED_STATUS = 403

REFRESH_REUSE_DETECTED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-reuse-detected"
REFRESH_REUSE_DETECTED_TITLE = "Refresh token reuse detected"
ORIGIN_NOT_ALLOWED_TYPE = "https://api.budgetbuddy.dev/problems/origin-not-allowed"
ORIGIN_NOT_ALLOWED_TITLE = "Forbidden"


def unauthorized_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=UNAUTHORIZED_STATUS,
        title=UNAUTHORIZED_TITLE,
        detail=detail,
        type_=UNAUTHORIZED_TYPE,
    )


def forbidden_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=FORBIDDEN_STATUS,
        title=FORBIDDEN_TITLE,
        detail=detail,
        type_=FORBIDDEN_TYPE,
    )


def not_acceptable_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=NOT_ACCEPTABLE_STATUS,
        title=NOT_ACCEPTABLE_TITLE,
        detail=detail,
        type_=NOT_ACCEPTABLE_TYPE,
    )


def refresh_revoked_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=REFRESH_REVOKED_STATUS,
        title=REFRESH_REVOKED_TITLE,
        detail=detail,
        type_=REFRESH_REVOKED_TYPE,
    )


def refresh_reuse_detected_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=REFRESH_REVOKED_STATUS,
        title=REFRESH_REUSE_DETECTED_TITLE,
        detail=detail,
        type_=REFRESH_REUSE_DETECTED_TYPE,
    )


def origin_not_allowed_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=FORBIDDEN_STATUS,
        title=ORIGIN_NOT_ALLOWED_TITLE,
        detail=detail,
        type_=ORIGIN_NOT_ALLOWED_TYPE,
    )
