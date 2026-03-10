from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.errors import APIError


def make_api_error(
    *,
    status: int,
    title: str,
    detail: str | None = None,
    type_: str | None = None,
    headers: dict[str, str] | None = None,
) -> "APIError":
    from app.core.errors import APIError

    return APIError(status=status, title=title, detail=detail, type_=type_, headers=headers)
