from app.errors._helpers import make_api_error

RATE_LIMITED_TYPE = "https://api.budgetbuddy.dev/problems/rate-limited"
RATE_LIMITED_TITLE = "Too Many Requests"
RATE_LIMITED_STATUS = 429

SERVICE_UNAVAILABLE_TYPE = "https://api.budgetbuddy.dev/problems/service-unavailable"
SERVICE_UNAVAILABLE_TITLE = "Service Unavailable"
SERVICE_UNAVAILABLE_STATUS = 503


def rate_limited_error(detail: str | None = None, retry_after: int | None = None) -> "APIError":
    headers = {"Retry-After": str(retry_after)} if retry_after is not None else None
    return make_api_error(
        status=RATE_LIMITED_STATUS,
        title=RATE_LIMITED_TITLE,
        detail=detail,
        type_=RATE_LIMITED_TYPE,
        headers=headers,
    )


def service_unavailable_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SERVICE_UNAVAILABLE_STATUS,
        title=SERVICE_UNAVAILABLE_TITLE,
        detail=detail,
        type_=SERVICE_UNAVAILABLE_TYPE,
    )
