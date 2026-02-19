import logging
import re

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.constants import PROBLEM_JSON


class APIError(Exception):
    def __init__(self, status: int, title: str, detail: str | None = None, type_: str | None = None):
        self.status = status
        self.title = title
        self.detail = detail
        self.type_ = type_ or "about:blank"
        super().__init__(title)


class ProblemDetails:
    @staticmethod
    def payload(status: int, title: str, detail: str | None = None, type_: str = "about:blank", instance: str | None = None) -> dict:
        payload = {
            "type": type_,
            "title": title,
            "status": status,
        }
        if detail:
            payload["detail"] = detail
        if instance:
            payload["instance"] = instance
        return payload


_LOGGER = logging.getLogger("app.errors")
_BEARER_RE = re.compile(r"(?i)bearer\s+[a-z0-9\-._~+/]+=*")
_JWT_RE = re.compile(r"\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
_SECRET_KV_RE = re.compile(r"(?i)\b(token|password|secret)\s*[:=]\s*\S+")


def sanitize_problem_detail(detail: str | None) -> str | None:
    if not detail:
        return None
    sanitized = detail
    if "Traceback (most recent call last)" in sanitized:
        return "An unexpected error occurred"
    sanitized = _BEARER_RE.sub("Bearer [REDACTED]", sanitized)
    sanitized = _JWT_RE.sub("[REDACTED]", sanitized)
    sanitized = _SECRET_KV_RE.sub(r"\1=[REDACTED]", sanitized)
    return sanitized.replace("\n", " ").replace("\r", " ")


def _problem_response(status: int, title: str, detail: str | None, request: Request, type_: str = "about:blank") -> JSONResponse:
    body = ProblemDetails.payload(
        status=status,
        title=title,
        detail=sanitize_problem_detail(detail),
        type_=type_,
        instance=str(request.url),
    )
    headers: dict[str, str] = {}
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        headers["X-Request-Id"] = request_id
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_JSON, headers=headers)


def register_exception_handlers(app) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        request_id = getattr(request.state, "request_id", "")
        _LOGGER.warning(
            "api_error request_id=%s path=%s status=%s problem_type=%s",
            request_id,
            request.url.path,
            exc.status,
            exc.type_,
        )
        return _problem_response(exc.status, exc.title, exc.detail, request, exc.type_)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return _problem_response(400, "Invalid request", str(exc), request)

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "")
        _LOGGER.exception(
            "unhandled_error request_id=%s path=%s",
            request_id,
            request.url.path,
            exc_info=exc,
        )
        return _problem_response(500, "Internal Server Error", "An unexpected error occurred", request)
