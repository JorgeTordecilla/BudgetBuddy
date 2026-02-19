from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.responses import vendor_response
from app.core.money import validate_user_currency_for_money
from app.db import get_db
from app.dependencies import get_current_user
from app.models import Category, Transaction, User

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
    validate_user_currency_for_money(current_user.currency_code)
    month_expr = _month_expr(db)
    income_expr = func.coalesce(func.sum(case((Transaction.type == "income", Transaction.amount_cents), else_=0)), 0)
    expense_expr = func.coalesce(func.sum(case((Transaction.type == "expense", Transaction.amount_cents), else_=0)), 0)

    stmt = (
        select(month_expr.label("month"), income_expr.label("income_total_cents"), expense_expr.label("expense_total_cents"))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .group_by(month_expr)
        .order_by(month_expr)
    )

    items = [
        {
            "month": row.month,
            "income_total_cents": int(row.income_total_cents),
            "expense_total_cents": int(row.expense_total_cents),
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
    validate_user_currency_for_money(current_user.currency_code)
    income_expr = func.coalesce(func.sum(case((Transaction.type == "income", Transaction.amount_cents), else_=0)), 0)
    expense_expr = func.coalesce(func.sum(case((Transaction.type == "expense", Transaction.amount_cents), else_=0)), 0)

    stmt = (
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            income_expr.label("income_total_cents"),
            expense_expr.label("expense_total_cents"),
        )
        .join(Category, Category.id == Transaction.category_id)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.date >= from_)
        .where(Transaction.date <= to)
        .group_by(Category.id, Category.name)
        .order_by(Category.name)
    )

    items = [
        {
            "category_id": row.category_id,
            "category_name": row.category_name,
            "income_total_cents": int(row.income_total_cents),
            "expense_total_cents": int(row.expense_total_cents),
        }
        for row in db.execute(stmt)
    ]
    return vendor_response({"items": items})
