from datetime import UTC, datetime

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


def _problem_response(status: int, title: str, detail: str | None, request: Request, type_: str = "about:blank") -> JSONResponse:
    body = ProblemDetails.payload(status=status, title=title, detail=detail, type_=type_, instance=str(request.url))
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_JSON)


def register_exception_handlers(app) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        return _problem_response(exc.status, exc.title, exc.detail, request, exc.type_)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return _problem_response(400, "Invalid request", str(exc), request)

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        _ = datetime.now(tz=UTC)
        return _problem_response(500, "Internal Server Error", "An unexpected error occurred", request)
