import re
from datetime import datetime

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditEvent
from app.repositories import SQLAlchemyAuditEventRepository

_TOKEN_LIKE_RE = re.compile(r"(?i)(bearer\s+|^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$)")
_SECRET_MARKER_RE = re.compile(r"(?i)(token|password|secret|authorization)")


def _safe_resource_id(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if _TOKEN_LIKE_RE.search(trimmed):
        return None
    if _SECRET_MARKER_RE.search(trimmed):
        return None
    return trimmed[:64]


def emit_audit_event(
    db: Session,
    *,
    request: Request | None,
    user_id: str,
    resource_type: str,
    resource_id: str | None,
    action: str,
    created_at: datetime | None = None,
) -> None:
    request_id = getattr(request.state, "request_id", "") if request is not None else ""
    event = AuditEvent(
        request_id=(request_id or "unknown")[:64],
        user_id=user_id,
        resource_type=resource_type[:40],
        resource_id=_safe_resource_id(resource_id),
        action=action[:64],
    )
    if created_at is not None:
        event.created_at = created_at
    SQLAlchemyAuditEventRepository(db).add(event)
