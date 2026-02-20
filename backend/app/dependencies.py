from datetime import UTC, datetime
from typing import Iterator

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.constants import API_PREFIX, CSV_TEXT, PROBLEM_JSON, VENDOR_JSON
from app.core.errors import APIError
from app.core.security import decode_access_token
from app.db import get_db
from app.errors import not_acceptable_error, unauthorized_error
from app.models import User
from app.repositories import SQLAlchemyUserRepository


_BODY_METHODS = {"POST", "PATCH", "PUT"}


def _parse_media_type(value: str) -> str:
    return value.split(";", 1)[0].strip().lower()


def _parse_accept_part(raw_part: str) -> tuple[str, float]:
    segments = [segment.strip() for segment in raw_part.split(";")]
    media_type = segments[0].lower()
    q = 1.0
    for param in segments[1:]:
        key, _, raw_value = param.partition("=")
        if key.strip().lower() != "q":
            continue
        try:
            q = float(raw_value.strip())
        except ValueError:
            q = 0.0
        break
    return media_type, q


def _iter_accept_media_types(value: str) -> Iterator[str]:
    for raw_part in value.split(","):
        media_type, q = _parse_accept_part(raw_part)
        if media_type and q > 0:
            yield media_type


def _accepts_media_types(accept: str, *, supported: set[str]) -> bool:
    for media_type in _iter_accept_media_types(accept):
        if media_type == "*/*":
            return True
        if media_type.endswith("/*"):
            media_prefix = media_type.split("/", 1)[0] + "/"
            if any(candidate.startswith(media_prefix) for candidate in supported):
                return True
            continue
        if media_type in supported:
            return True
    return False


def _accepts_vendor_or_problem(accept: str) -> bool:
    return _accepts_media_types(accept, supported={VENDOR_JSON, PROBLEM_JSON})


def enforce_accept_header(request: Request) -> None:
    if not request.url.path.startswith(API_PREFIX):
        return
    if request.url.path in {
        f"{API_PREFIX}/health",
        f"{API_PREFIX}/healthz",
        f"{API_PREFIX}/readyz",
        f"{API_PREFIX}/openapi.json",
    }:
        return

    accept = request.headers.get("accept", "*/*")
    supported = {VENDOR_JSON, PROBLEM_JSON}
    if request.url.path == f"{API_PREFIX}/transactions/export":
        supported = {CSV_TEXT, PROBLEM_JSON}
    if not _accepts_media_types(accept, supported=supported):
        raise not_acceptable_error("Unsupported Accept header")


def enforce_content_type(request: Request) -> None:
    if request.method not in _BODY_METHODS:
        return
    if request.url.path in {
        f"{API_PREFIX}/health",
        f"{API_PREFIX}/healthz",
        f"{API_PREFIX}/readyz",
        f"{API_PREFIX}/openapi.json",
    }:
        return

    content_type = _parse_media_type(request.headers.get("content-type", ""))
    if content_type != VENDOR_JSON:
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
    if not isinstance(payload, dict):
        raise unauthorized_error("Access token is invalid or expired")

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id.strip():
        raise unauthorized_error("Access token is invalid or expired")
    user_id = user_id.strip()

    user = SQLAlchemyUserRepository(db).get_by_id(user_id)
    if not user:
        raise unauthorized_error("Access token is invalid or expired")
    return user


def utcnow() -> datetime:
    return datetime.now(tz=UTC)
