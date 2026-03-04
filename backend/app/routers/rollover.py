from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import category_type_mismatch_error, invalid_date_range_error, rollover_already_applied_error, rollover_no_surplus_error
from app.models import Account, Category, IncomeSource, MonthlyRollover, Transaction, User
from app.schemas import RolloverApplyOut, RolloverApplyRequest, RolloverPreviewOut

router = APIRouter(prefix="/rollover", tags=["rollover"])


def _normalize_rollover_source(source: IncomeSource) -> IncomeSource:
    source.archived_at = None
    source.is_active = False
    source.expected_amount_cents = 0
    source.frequency = "monthly"
    source.updated_at = utcnow()
    return source


def _month_bounds(month: str) -> tuple[date, date]:
    year = int(month[:4])
    month_num = int(month[5:7])
    if month_num < 1 or month_num > 12:
        raise invalid_date_range_error("month must be a valid YYYY-MM value")
    start = date(year, month_num, 1)
    if month_num == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month_num + 1, 1) - timedelta(days=1)
    return start, end


def _next_month_start(month: str) -> date:
    year = int(month[:4])
    month_num = int(month[5:7])
    month_num += 1
    if month_num > 12:
        month_num = 1
        year += 1
    return date(year, month_num, 1)


def _compute_surplus_cents(db: Session, user_id: str, source_month: str) -> int:
    month_start, month_end = _month_bounds(source_month)
    income_expr = func.coalesce(func.sum(case((Transaction.type == "income", Transaction.amount_cents), else_=0)), 0)
    expense_expr = func.coalesce(func.sum(case((Transaction.type == "expense", Transaction.amount_cents), else_=0)), 0)
    row = db.execute(
        select(income_expr.label("income_total_cents"), expense_expr.label("expense_total_cents"))
        .where(Transaction.user_id == user_id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.date >= month_start)
        .where(Transaction.date <= month_end)
    ).one()
    return max(0, int(row.income_total_cents) - int(row.expense_total_cents))


def _owned_active_account_or_conflict(db: Session, user_id: str, account_id: str) -> Account:
    account = db.scalar(
        select(Account)
        .where(Account.id == account_id)
        .where(Account.user_id == user_id)
    )
    if not account or account.archived_at is not None:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    return account


def _owned_active_income_category_or_conflict(db: Session, user_id: str, category_id: str) -> Category:
    category = db.scalar(
        select(Category)
        .where(Category.id == category_id)
        .where(Category.user_id == user_id)
    )
    if not category or category.archived_at is not None:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    if category.type != "income":
        raise category_type_mismatch_error()
    return category


def _get_or_create_rollover_income_source(db: Session, current_user: User) -> IncomeSource:
    source = db.scalar(
        select(IncomeSource)
        .where(IncomeSource.user_id == current_user.id)
        .where(IncomeSource.name == "Rollover")
        .order_by(IncomeSource.created_at.desc())
    )
    if source:
        return _normalize_rollover_source(source)

    created = IncomeSource(
        user_id=current_user.id,
        name="Rollover",
        expected_amount_cents=0,
        frequency="monthly",
        is_active=False,
        note="System rollover source",
    )
    try:
        with db.begin_nested():
            db.add(created)
            db.flush()
        return created
    except IntegrityError:
        source = db.scalar(
            select(IncomeSource)
            .where(IncomeSource.user_id == current_user.id)
            .where(IncomeSource.name == "Rollover")
            .order_by(IncomeSource.created_at.desc())
        )
        if not source:
            raise
        return _normalize_rollover_source(source)


@router.get("/preview")
def rollover_preview(
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    surplus = _compute_surplus_cents(db, current_user.id, month)
    applied = db.scalar(
        select(MonthlyRollover)
        .where(MonthlyRollover.user_id == current_user.id)
        .where(MonthlyRollover.source_month == month)
    )
    payload = RolloverPreviewOut(
        month=month,
        surplus_cents=surplus,
        already_applied=applied is not None,
        applied_transaction_id=applied.transaction_id if applied else None,
    ).model_dump(mode="json")
    return vendor_response(payload)


@router.post("/apply")
def rollover_apply(
    payload: RolloverApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _owned_active_account_or_conflict(db, current_user.id, payload.account_id)
    _owned_active_income_category_or_conflict(db, current_user.id, payload.category_id)

    source_month = payload.source_month
    surplus = _compute_surplus_cents(db, current_user.id, source_month)
    if surplus <= 0:
        raise rollover_no_surplus_error("No positive surplus is available for source month")

    next_month_date = _next_month_start(source_month)
    source = _get_or_create_rollover_income_source(db, current_user)

    row = Transaction(
        user_id=current_user.id,
        type="income",
        account_id=payload.account_id,
        category_id=payload.category_id,
        income_source_id=source.id,
        amount_cents=surplus,
        date=next_month_date,
        merchant="Rollover",
        note=f"Rollover from {source_month}",
    )
    db.add(row)
    db.flush()

    applied = MonthlyRollover(
        user_id=current_user.id,
        source_month=source_month,
        transaction_id=row.id,
        amount_cents=surplus,
    )
    db.add(applied)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise rollover_already_applied_error("Rollover for source month was already applied") from exc

    response = RolloverApplyOut(
        source_month=source_month,
        target_month=next_month_date.strftime("%Y-%m"),
        transaction_id=row.id,
        amount_cents=surplus,
    ).model_dump(mode="json")
    return vendor_response(response, status_code=201)
