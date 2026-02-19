from datetime import UTC, datetime

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.constants import API_PREFIX, PROBLEM_JSON, VENDOR_JSON
from app.core.errors import APIError
from app.core.security import decode_access_token
from app.db import get_db
from app.errors import not_acceptable_error, unauthorized_error
from app.models import User
from app.repositories import SQLAlchemyUserRepository


_BODY_METHODS = {"POST", "PATCH", "PUT"}


def _accepts_vendor_or_problem(accept: str) -> bool:
    value = accept.lower()
    if "*/*" in value:
        return True
    return (VENDOR_JSON in value) or (PROBLEM_JSON in value)


def enforce_accept_header(request: Request) -> None:
    if not request.url.path.startswith(API_PREFIX):
        return
    if request.url.path in {f"{API_PREFIX}/health", f"{API_PREFIX}/openapi.json"}:
        return

    accept = request.headers.get("accept", "*/*")
    if not _accepts_vendor_or_problem(accept):
        raise not_acceptable_error("Unsupported Accept header")


def enforce_content_type(request: Request) -> None:
    if request.method not in _BODY_METHODS:
        return
    if request.url.path in {f"{API_PREFIX}/health", f"{API_PREFIX}/openapi.json"}:
        return

    content_type = request.headers.get("content-type", "").lower()
    if VENDOR_JSON not in content_type:
        raise APIError(status=400, title="Invalid request", detail="Unsupported Content-Type")


def get_current_user(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise unauthorized_error("Access token is invalid or expired")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise unauthorized_error("Access token is invalid or expired") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized_error("Access token is invalid or expired")

    user = SQLAlchemyUserRepository(db).get_by_id(user_id)
    if not user:
        raise unauthorized_error("Access token is invalid or expired")
    return user


def utcnow() -> datetime:
    return datetime.now(tz=UTC)
