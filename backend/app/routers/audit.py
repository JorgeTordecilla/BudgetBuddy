from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user
from app.errors import invalid_date_range_error
from app.models import AuditEvent, User
from app.routers._crud_common import apply_created_cursor, build_created_cursor_page
from app.schemas import AuditEventOut, AuditListResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_audit_events(
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if from_ and to and from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")

    stmt = select(AuditEvent).where(AuditEvent.user_id == current_user.id)
    if from_:
        stmt = stmt.where(AuditEvent.created_at >= from_)
    if to:
        stmt = stmt.where(AuditEvent.created_at <= to)
    if cursor:
        stmt = apply_created_cursor(stmt, cursor, AuditEvent)

    stmt = stmt.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    items, next_cursor = build_created_cursor_page(rows, limit)

    payload = AuditListResponse(
        items=[AuditEventOut.model_validate(row) for row in items],
        next_cursor=next_cursor,
    ).model_dump(mode="json")
    return vendor_response(payload)
