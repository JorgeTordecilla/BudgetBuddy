import re
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.money import validate_limit_cents, validate_user_currency_for_money
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import (
    budget_duplicate_error,
    budget_month_invalid_error,
    category_archived_error,
    category_not_owned_error,
    forbidden_error,
)
from app.models import Budget, User
from app.repositories import SQLAlchemyBudgetRepository, SQLAlchemyCategoryRepository
from app.schemas import BudgetCreate, BudgetListResponse, BudgetOut, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])

_MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _validate_month_or_400(month: str) -> str:
    if not _MONTH_PATTERN.fullmatch(month):
        raise budget_month_invalid_error("month must match YYYY-MM")
    return month


def _owned_budget_or_403(db: Session, user_id: str, budget_id: str) -> Budget:
    budget = SQLAlchemyBudgetRepository(db).get_owned(user_id, budget_id)
    if not budget:
        raise forbidden_error("Not allowed")
    return budget


def _owned_active_category_or_409(db: Session, user_id: str, category_id: str):
    category = SQLAlchemyCategoryRepository(db).get_owned(user_id, category_id)
    if not category:
        raise category_not_owned_error()
    if category.archived_at is not None:
        raise category_archived_error()
    return category


@router.get("")
def list_budgets(
    from_: str = Query(alias="from"),
    to: str = Query(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from_month = _validate_month_or_400(from_)
    to_month = _validate_month_or_400(to)
    if from_month > to_month:
        raise budget_month_invalid_error("from must be less than or equal to to")
    rows = SQLAlchemyBudgetRepository(db).list_for_user_month_range(current_user.id, from_month, to_month)
    payload = BudgetListResponse(items=[BudgetOut.model_validate(row) for row in rows]).model_dump(mode="json")
    return vendor_response(payload)


@router.post("")
def create_budget(payload: BudgetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump()
    validate_user_currency_for_money(current_user.currency_code)
    data["month"] = _validate_month_or_400(data["month"])
    data["limit_cents"] = validate_limit_cents(data["limit_cents"])
    _owned_active_category_or_409(db, current_user.id, data["category_id"])

    repo = SQLAlchemyBudgetRepository(db)
    row = Budget(user_id=current_user.id, **data)
    repo.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise budget_duplicate_error() from exc
    db.refresh(row)
    return vendor_response(BudgetOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{budget_id}")
def get_budget(budget_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_budget_or_403(db, current_user.id, str(budget_id))
    return vendor_response(BudgetOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{budget_id}")
def patch_budget(
    budget_id: UUID,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_budget_or_403(db, current_user.id, str(budget_id))
    data = payload.model_dump(exclude_unset=True)

    merged_month = _validate_month_or_400(data.get("month", row.month))
    merged_limit = validate_limit_cents(data.get("limit_cents", row.limit_cents))
    merged_category_id = data.get("category_id", row.category_id)
    _owned_active_category_or_409(db, current_user.id, merged_category_id)

    data["month"] = merged_month
    data["limit_cents"] = merged_limit
    data["category_id"] = merged_category_id
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = utcnow()
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise budget_duplicate_error() from exc
    db.refresh(row)
    return vendor_response(BudgetOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_budget_or_403(db, current_user.id, str(budget_id))
    now = utcnow()
    row.archived_at = now
    row.updated_at = now
    db.commit()
    return Response(status_code=204)
