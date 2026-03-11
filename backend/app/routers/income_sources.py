from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import emit_audit_event
from app.core.errors import APIError
from app.core.money import validate_limit_cents, validate_user_currency_for_money
from app.core.responses import vendor_response
from app.db import get_db
from app.core.utils import utcnow
from app.dependencies import get_current_user
from app.errors import forbidden_error
from app.models import IncomeSource, User
from app.repositories import SQLAlchemyIncomeSourceRepository
from app.schemas import IncomeSourceCreate, IncomeSourceListOut, IncomeSourceOut, IncomeSourceUpdate

router = APIRouter(prefix="/income-sources", tags=["income-sources"])
SYSTEM_ROLLOVER_SOURCE_NAME = "Rollover"
SYSTEM_ROLLOVER_SOURCE_NOTE = "System rollover source"


def _owned_income_source_or_403(db: Session, user_id: str, income_source_id: str) -> IncomeSource:
    row = SQLAlchemyIncomeSourceRepository(db).get_owned(user_id, income_source_id)
    if not row:
        raise forbidden_error("Not allowed")
    return row


@router.get("")
def list_income_sources(
    include_archived: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(IncomeSource).where(IncomeSource.user_id == current_user.id)
    stmt = stmt.where(
        ~and_(
            IncomeSource.name == SYSTEM_ROLLOVER_SOURCE_NAME,
            IncomeSource.note == SYSTEM_ROLLOVER_SOURCE_NOTE,
            IncomeSource.is_active.is_(False),
        )
    )
    if not include_archived:
        stmt = stmt.where(IncomeSource.archived_at.is_(None))
    stmt = stmt.order_by(IncomeSource.created_at.desc(), IncomeSource.id.desc())
    rows = list(db.scalars(stmt))
    payload = IncomeSourceListOut(items=[IncomeSourceOut.model_validate(row) for row in rows]).model_dump(mode="json")
    return vendor_response(payload)


@router.post("")
def create_income_source(
    payload: IncomeSourceCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    validate_user_currency_for_money(current_user.currency_code)
    data["expected_amount_cents"] = validate_limit_cents(data["expected_amount_cents"])

    repo = SQLAlchemyIncomeSourceRepository(db)
    row = IncomeSource(user_id=current_user.id, **data)
    repo.add(row)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Income source name already exists") from exc

    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="income_source",
        resource_id=row.id,
        action="income_source.create",
    )
    db.commit()
    db.refresh(row)
    return vendor_response(IncomeSourceOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{income_source_id}")
def get_income_source(income_source_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_income_source_or_403(db, current_user.id, str(income_source_id))
    return vendor_response(IncomeSourceOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{income_source_id}")
def patch_income_source(
    income_source_id: UUID,
    payload: IncomeSourceUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_income_source_or_403(db, current_user.id, str(income_source_id))
    previous_archived_at = row.archived_at
    data = payload.model_dump(exclude_unset=True)
    if "expected_amount_cents" in data:
        validate_user_currency_for_money(current_user.currency_code)
        data["expected_amount_cents"] = validate_limit_cents(data["expected_amount_cents"])

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = utcnow()

    action = "income_source.restore" if previous_archived_at is not None and row.archived_at is None else "income_source.update"
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="income_source",
        resource_id=row.id,
        action=action,
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Income source name already exists") from exc
    db.refresh(row)
    return vendor_response(IncomeSourceOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{income_source_id}", status_code=204)
def delete_income_source(
    income_source_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_income_source_or_403(db, current_user.id, str(income_source_id))
    now = utcnow()
    row.archived_at = now
    row.updated_at = now
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="income_source",
        resource_id=row.id,
        action="income_source.archive",
        created_at=now,
    )
    db.commit()
    return Response(status_code=204)
