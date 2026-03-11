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
    bind = db.get_bind()
    dialect = bind.dialect.name if bind is not None else ""
    if dialect == "sqlite":
        return func.strftime("%Y-%m", Transaction.date)
    return func.to_char(Transaction.date, "YYYY-MM")


def _previous_month(month: str) -> str:
    year = int(month[:4])
    month_num = int(month[5:7])
    month_num -= 1
    if month_num == 0:
        month_num = 12
        year -= 1
    return f"{year:04d}-{month_num:02d}"


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
    prior_month_start = date(from_.year - 1, 12, 1) if from_.month == 1 else date(from_.year, from_.month - 1, 1)
    monthly_stmt = (
        select(
            month_expr.label("month"),
            income_expr.label("income_total_cents"),
            expense_expr.label("expense_total_cents"),
        )
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.date >= prior_month_start)
        .where(Transaction.date <= to)
        .group_by(month_expr)
    )

    budget_stmt = (
        select(
            Budget.month.label("month"),
            func.coalesce(func.sum(Budget.limit_cents), 0).label("budget_limit_cents"),
        )
        .join(Category, Category.id == Budget.category_id)
        .where(Budget.user_id == current_user.id)
        .where(Budget.archived_at.is_(None))
        .where(Category.type == "expense")
        .where(Budget.month >= from_month)
        .where(Budget.month <= to_month)
        .group_by(Budget.month)
    )

    monthly_rows = list(db.execute(monthly_stmt))
    budget_by_month = {row.month: int(row.budget_limit_cents) for row in db.execute(budget_stmt)}
    active_sources = _active_income_sources_for_user(db, current_user.id)
    expected_totals_by_month = _expected_income_totals_by_month(
        [row.month for row in monthly_rows if from_month <= row.month <= to_month],
        active_sources,
    )
    net_by_month = {
        row.month: max(0, int(row.income_total_cents) - int(row.expense_total_cents))
        for row in monthly_rows
    }

    items = [
        {
            "month": row.month,
            "income_total_cents": int(row.income_total_cents),
            "expense_total_cents": int(row.expense_total_cents),
            "expected_income_cents": int(expected_totals_by_month.get(row.month, 0)),
            "actual_income_cents": int(row.income_total_cents),
            "rollover_in_cents": int(net_by_month.get(_previous_month(row.month), 0)),
            "budget_spent_cents": int(row.expense_total_cents),
            "budget_limit_cents": int(budget_by_month.get(row.month, 0)),
        }
        for row in sorted(monthly_rows, key=lambda current: current.month)
        if from_month <= row.month <= to_month
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
            Category.type.label("category_type"),
            income_expr.label("income_total_cents"),
            expense_expr.label("expense_total_cents"),
        )
        .join(Category, Category.id == Transaction.category_id)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .group_by(Category.id, Category.name, Category.type)
    )
    tx_subq = tx_stmt.subquery()

    budget_stmt = (
        select(
            Budget.category_id.label("category_id"),
            func.coalesce(func.sum(Budget.limit_cents), 0).label("budget_limit_cents"),
        )
        .join(Category, Category.id == Budget.category_id)
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
            tx_subq.c.category_type,
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
            "category_type": row.category_type,
            "income_total_cents": int(row.income_total_cents),
            "expense_total_cents": int(row.expense_total_cents),
            "budget_spent_cents": int(row.expense_total_cents) if row.category_type == "expense" else 0,
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


def _active_income_sources_for_user(db: Session, user_id: str) -> list[IncomeSource]:
    return list(
        db.scalars(
            select(IncomeSource)
            .where(IncomeSource.user_id == user_id)
            .where(IncomeSource.archived_at.is_(None))
            .where(IncomeSource.is_active.is_(True))
            .order_by(IncomeSource.name.asc())
        )
    )


def _expected_income_totals_by_month(months: list[str], active_sources: list[IncomeSource]) -> dict[str, int]:
    expected_total = sum(int(source.expected_amount_cents) for source in active_sources)
    return {month: expected_total for month in months}


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
    active_sources = _active_income_sources_for_user(db, current_user.id)
    active_source_ids = {source.id for source in active_sources}
    expected_totals_by_month = _expected_income_totals_by_month(months, active_sources)

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
        expected_total = expected_totals_by_month.get(month, 0)
        actual_total = 0

        for source in active_sources:
            expected = int(source.expected_amount_cents)
            actual = actual_by_month_source.get((month, source.id), 0)
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


@router.get("/impulse-summary")
def analytics_impulse_summary(
    from_: date = Query(alias="from"),
    to: date = Query(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")
    validate_user_currency_for_money(current_user.currency_code)

    counts_stmt = select(
        func.coalesce(func.sum(case((Transaction.is_impulse.is_(True), 1), else_=0)), 0).label("impulse_count"),
        func.coalesce(func.sum(case((Transaction.is_impulse.is_(False), 1), else_=0)), 0).label("intentional_count"),
        func.coalesce(func.sum(case((Transaction.is_impulse.is_(None), 1), else_=0)), 0).label("untagged_count"),
    ).where(
        Transaction.user_id == current_user.id,
        Transaction.archived_at.is_(None),
        Transaction.date >= from_,
        Transaction.date <= to,
    )
    counts = db.execute(counts_stmt).one()

    top_stmt = (
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.count(Transaction.id).label("count"),
        )
        .join(Category, Category.id == Transaction.category_id)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.archived_at.is_(None))
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .where(Transaction.type == "expense")
        .where(Transaction.is_impulse.is_(True))
        .group_by(Category.id, Category.name)
        .order_by(func.count(Transaction.id).desc(), Category.name.asc())
        .limit(5)
    )

    return vendor_response(
        {
            "impulse_count": int(counts.impulse_count),
            "intentional_count": int(counts.intentional_count),
            "untagged_count": int(counts.untagged_count),
            "top_impulse_categories": [
                {
                    "category_id": row.category_id,
                    "category_name": row.category_name,
                    "count": int(row.count),
                }
                for row in db.execute(top_stmt)
            ],
        }
    )
