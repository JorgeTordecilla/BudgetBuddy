from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.pagination import decode_cursor, encode_cursor, parse_datetime
from app.errors import invalid_cursor_error


def apply_created_cursor(stmt: Any, cursor: str, model: Any) -> Any:
    data = decode_cursor(cursor)
    c_created_raw = data.get("created_at")
    c_id = data.get("id")
    if not isinstance(c_created_raw, str) or not isinstance(c_id, str):
        raise invalid_cursor_error()
    c_created = parse_datetime(c_created_raw)
    created_at_col = getattr(model, "created_at")
    id_col = getattr(model, "id")
    return stmt.where(or_(created_at_col < c_created, and_(created_at_col == c_created, id_col < c_id)))


def build_created_cursor_page(rows: list[Any], limit: int) -> tuple[list[Any], str | None]:
    items = rows[:limit]
    if len(rows) <= limit:
        return items, None
    last = items[-1]
    next_cursor = encode_cursor({"created_at": last.created_at.isoformat(), "id": last.id})
    return items, next_cursor


def commit_or_conflict(db: Session, detail: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail=detail) from exc
