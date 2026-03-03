from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.responses import vendor_response
from app.core.money import validate_user_currency_for_money
from app.db import get_db
from app.dependencies import get_current_user
from app.errors import invalid_date_range_error
from app.models import Budget, Category, IncomeSource, Transaction, User

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _month_expr(db: Session):
    dialect = db.bind.dialect.name if db.bind is not None else ""
    if dialect == "sqlite":
        return func.strftime("%Y-%m", Transaction.date)
    return func.to_char(Transaction.date, "YYYY-MM")


@router.get("/by-month")
def analytics_by_month(
    from_: date = Query(alias="from"),
    to: date = Query(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")
    validate_user_currency_for_money(current_user.currency_code)
    month_expr = _month_expr(db)
    income_expr = func.coalesce(func.sum(case((Transaction.type == "income", Transaction.amount_cents), else_=0)), 0)
    expense_expr = func.coalesce(func.sum(case((Transaction.type == "expense", Transaction.amount_cents), else_=0)), 0)
    from_month = f"{from_.year:04d}-{from_.month:02d}"
    to_month = f"{to.year:04d}-{to.month:02d}"

    tx_stmt = (
        select(
            month_expr.label("month"),
            income_expr.label("income_total_cents"),
            expense_expr.label("expense_total_cents"),
        )
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .group_by(month_expr)
    )
    tx_subq = tx_stmt.subquery()

    budget_stmt = (
        select(
            Budget.month.label("month"),
            func.coalesce(func.sum(Budget.limit_cents), 0).label("budget_limit_cents"),
        )
        .where(Budget.user_id == current_user.id)
        .where(Budget.archived_at.is_(None))
        .where(Budget.month >= from_month)
        .where(Budget.month <= to_month)
        .group_by(Budget.month)
    )
    budget_subq = budget_stmt.subquery()

    stmt = (
        select(
            tx_subq.c.month,
            tx_subq.c.income_total_cents,
            tx_subq.c.expense_total_cents,
            func.coalesce(budget_subq.c.budget_limit_cents, 0).label("budget_limit_cents"),
        )
        .select_from(tx_subq)
        .outerjoin(budget_subq, budget_subq.c.month == tx_subq.c.month)
        .order_by(tx_subq.c.month)
    )
    expected_income_total = int(
        db.scalar(
            select(func.coalesce(func.sum(IncomeSource.expected_amount_cents), 0))
            .where(IncomeSource.user_id == current_user.id)
            .where(IncomeSource.archived_at.is_(None))
            .where(IncomeSource.is_active.is_(True))
        )
        or 0
    )

    items = [
        {
            "month": row.month,
            "income_total_cents": int(row.income_total_cents),
            "expense_total_cents": int(row.expense_total_cents),
            "expected_income_cents": expected_income_total,
            "actual_income_cents": int(row.income_total_cents),
            "budget_spent_cents": int(row.expense_total_cents),
            "budget_limit_cents": int(row.budget_limit_cents),
        }
        for row in db.execute(stmt)
    ]
    return vendor_response({"items": items})


@router.get("/by-category")
def analytics_by_category(
    from_: date = Query(alias="from"),
    to: date = Query(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")
    validate_user_currency_for_money(current_user.currency_code)
    income_expr = func.coalesce(func.sum(case((Transaction.type == "income", Transaction.amount_cents), else_=0)), 0)
    expense_expr = func.coalesce(func.sum(case((Transaction.type == "expense", Transaction.amount_cents), else_=0)), 0)
    from_month = f"{from_.year:04d}-{from_.month:02d}"
    to_month = f"{to.year:04d}-{to.month:02d}"

    tx_stmt = (
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            income_expr.label("income_total_cents"),
            expense_expr.label("expense_total_cents"),
        )
        .join(Category, Category.id == Transaction.category_id)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .group_by(Category.id, Category.name)
    )
    tx_subq = tx_stmt.subquery()

    budget_stmt = (
        select(
            Budget.category_id.label("category_id"),
            func.coalesce(func.sum(Budget.limit_cents), 0).label("budget_limit_cents"),
        )
        .where(Budget.user_id == current_user.id)
        .where(Budget.archived_at.is_(None))
        .where(Budget.month >= from_month)
        .where(Budget.month <= to_month)
        .group_by(Budget.category_id)
    )
    budget_subq = budget_stmt.subquery()

    stmt = (
        select(
            tx_subq.c.category_id,
            tx_subq.c.category_name,
            tx_subq.c.income_total_cents,
            tx_subq.c.expense_total_cents,
            func.coalesce(budget_subq.c.budget_limit_cents, 0).label("budget_limit_cents"),
        )
        .select_from(tx_subq)
        .outerjoin(budget_subq, budget_subq.c.category_id == tx_subq.c.category_id)
        .order_by(tx_subq.c.category_name)
    )

    items = [
        {
            "category_id": row.category_id,
            "category_name": row.category_name,
            "income_total_cents": int(row.income_total_cents),
            "expense_total_cents": int(row.expense_total_cents),
            "budget_spent_cents": int(row.expense_total_cents),
            "budget_limit_cents": int(row.budget_limit_cents),
        }
        for row in db.execute(stmt)
    ]
    return vendor_response({"items": items})


def _iter_months(from_: date, to: date) -> list[str]:
    months: list[str] = []
    year = from_.year
    month = from_.month
    while (year, month) <= (to.year, to.month):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months


@router.get("/income")
def analytics_income(
    from_: date = Query(alias="from"),
    to: date = Query(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")
    validate_user_currency_for_money(current_user.currency_code)

    months = _iter_months(from_, to)
    active_sources = list(
        db.scalars(
            select(IncomeSource)
            .where(IncomeSource.user_id == current_user.id)
            .where(IncomeSource.archived_at.is_(None))
            .where(IncomeSource.is_active.is_(True))
            .order_by(IncomeSource.name.asc())
        )
    )
    active_source_ids = {source.id for source in active_sources}

    month_expr = _month_expr(db)
    actual_stmt = (
        select(
            month_expr.label("month"),
            Transaction.income_source_id.label("income_source_id"),
            func.coalesce(func.sum(Transaction.amount_cents), 0).label("actual_income_cents"),
        )
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.type == "income")
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .group_by(month_expr, Transaction.income_source_id)
    )
    actual_rows = list(db.execute(actual_stmt))
    actual_by_month_source: dict[tuple[str, str | None], int] = {
        (row.month, row.income_source_id): int(row.actual_income_cents) for row in actual_rows
    }

    items: list[dict] = []
    for month in months:
        rows: list[dict] = []
        expected_total = 0
        actual_total = 0

        for source in active_sources:
            expected = int(source.expected_amount_cents)
            actual = actual_by_month_source.get((month, source.id), 0)
            expected_total += expected
            actual_total += actual
            rows.append(
                {
                    "income_source_id": source.id,
                    "income_source_name": source.name,
                    "expected_income_cents": expected,
                    "actual_income_cents": actual,
                }
            )

        unassigned_actual = 0
        for (row_month, row_source_id), amount in actual_by_month_source.items():
            if row_month != month:
                continue
            if row_source_id is None or row_source_id not in active_source_ids:
                unassigned_actual += amount
        if unassigned_actual > 0:
            rows.append(
                {
                    "income_source_id": None,
                    "income_source_name": "Unassigned",
                    "expected_income_cents": 0,
                    "actual_income_cents": unassigned_actual,
                }
            )
            actual_total += unassigned_actual

        items.append(
            {
                "month": month,
                "expected_income_cents": expected_total,
                "actual_income_cents": actual_total,
                "rows": rows,
            }
        )

    return vendor_response({"items": items})
