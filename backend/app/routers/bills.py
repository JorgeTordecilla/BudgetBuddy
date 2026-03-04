import re
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import (
    account_archived_error,
    bill_already_paid_error,
    bill_category_type_mismatch_error,
    bill_due_day_invalid_error,
    bill_inactive_for_month_error,
    category_archived_error,
    forbidden_error,
)
from app.models import Account, Bill, BillPayment, Category, Transaction, User
from app.schemas import (
    BillCreate,
    BillListOut,
    BillMonthlyStatusItem,
    BillMonthlyStatusOut,
    BillMonthlyStatusSummary,
    BillOut,
    BillPaymentCreate,
    BillPaymentOut,
    BillUpdate,
)

router = APIRouter(prefix="/bills", tags=["bills"])

_MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _validate_due_day(due_day: int) -> int:
    if due_day < 1 or due_day > 28:
        raise bill_due_day_invalid_error()
    return due_day


def _validate_non_negative_cents(name: str, value: int) -> int:
    if value < 0:
        raise APIError(status=422, title="Unprocessable Entity", detail=f"{name} must be greater than or equal to 0")
    return value


def _validate_month_or_422(month: str) -> str:
    if not _MONTH_PATTERN.fullmatch(month):
        raise APIError(status=422, title="Unprocessable Entity", detail="month must match YYYY-MM")
    return month


def _month_due_date(month: str, due_day: int) -> date:
    year = int(month[:4])
    month_num = int(month[5:7])
    return date(year, month_num, due_day)


def _owned_bill_or_403(db: Session, user_id: str, bill_id: str) -> Bill:
    row = db.scalar(select(Bill).where(Bill.id == bill_id).where(Bill.user_id == user_id))
    if not row:
        raise forbidden_error("Not allowed")
    return row


def _owned_account_or_403(db: Session, user_id: str, account_id: str) -> Account:
    row = db.scalar(select(Account).where(Account.id == account_id).where(Account.user_id == user_id))
    if not row:
        raise forbidden_error("Not allowed")
    if row.archived_at is not None:
        raise account_archived_error()
    return row


def _owned_expense_category_or_error(db: Session, user_id: str, category_id: str) -> Category:
    row = db.scalar(select(Category).where(Category.id == category_id).where(Category.user_id == user_id))
    if not row:
        raise forbidden_error("Not allowed")
    if row.archived_at is not None:
        raise category_archived_error()
    if row.type != "expense":
        raise bill_category_type_mismatch_error()
    return row


@router.post("")
def create_bill(payload: BillCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["due_day"] = _validate_due_day(data["due_day"])
    data["budget_cents"] = _validate_non_negative_cents("budget_cents", data["budget_cents"])
    _owned_account_or_403(db, current_user.id, data["account_id"])
    _owned_expense_category_or_error(db, current_user.id, data["category_id"])

    row = Bill(user_id=current_user.id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return vendor_response(BillOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("")
def list_bills(
    include_archived: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Bill).where(Bill.user_id == current_user.id)
    if not include_archived:
        stmt = stmt.where(Bill.archived_at.is_(None))
    rows = list(db.scalars(stmt.order_by(Bill.due_day.asc(), Bill.created_at.asc())))
    return vendor_response(BillListOut(items=[BillOut.model_validate(row) for row in rows]).model_dump(mode="json"))


@router.get("/monthly-status")
def get_monthly_status(
    month: str = Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    month = _validate_month_or_422(month)
    today = date.today()
    current_month = today.strftime("%Y-%m")

    bills = list(
        db.scalars(
            select(Bill)
            .where(Bill.user_id == current_user.id)
            .where(Bill.archived_at.is_(None))
            .where(Bill.is_active.is_(True))
            .order_by(Bill.due_day.asc(), Bill.created_at.asc())
        )
    )
    bill_ids = [bill.id for bill in bills]

    payment_by_bill_id: dict[str, BillPayment] = {}
    if bill_ids:
        payments = list(
            db.scalars(
                select(BillPayment)
                .where(BillPayment.user_id == current_user.id)
                .where(BillPayment.month == month)
                .where(BillPayment.bill_id.in_(bill_ids))
            )
        )
        payment_by_bill_id = {payment.bill_id: payment for payment in payments}

    items: list[BillMonthlyStatusItem] = []
    total_budget_cents = 0
    total_paid_cents = 0
    paid_count = 0

    for bill in bills:
        total_budget_cents += bill.budget_cents
        payment = payment_by_bill_id.get(bill.id)
        due_date = _month_due_date(month, bill.due_day)
        if payment:
            status = "paid"
            actual_cents = payment.actual_cents
            transaction_id = payment.transaction_id
            diff_cents = payment.actual_cents - bill.budget_cents
            total_paid_cents += payment.actual_cents
            paid_count += 1
        else:
            if month == current_month and due_date < today:
                status = "overdue"
            else:
                status = "pending"
            actual_cents = None
            transaction_id = None
            diff_cents = None

        items.append(
            BillMonthlyStatusItem(
                bill_id=bill.id,
                name=bill.name,
                due_day=bill.due_day,
                due_date=due_date.isoformat(),
                budget_cents=bill.budget_cents,
                status=status,
                actual_cents=actual_cents,
                transaction_id=transaction_id,
                diff_cents=diff_cents,
            )
        )

    pending_count = len(items) - paid_count
    payload = BillMonthlyStatusOut(
        month=month,
        summary=BillMonthlyStatusSummary(
            total_budget_cents=total_budget_cents,
            total_paid_cents=total_paid_cents,
            total_pending_cents=total_budget_cents - total_paid_cents,
            paid_count=paid_count,
            pending_count=pending_count,
        ),
        items=items,
    ).model_dump(mode="json")
    return vendor_response(payload)


@router.get("/{bill_id}")
def get_bill(bill_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_bill_or_403(db, current_user.id, str(bill_id))
    return vendor_response(BillOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{bill_id}")
def patch_bill(
    bill_id: UUID,
    payload: BillUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_bill_or_403(db, current_user.id, str(bill_id))
    data = payload.model_dump(exclude_unset=True)

    if "due_day" in data:
        data["due_day"] = _validate_due_day(data["due_day"])
    if "budget_cents" in data:
        data["budget_cents"] = _validate_non_negative_cents("budget_cents", data["budget_cents"])
    if "account_id" in data:
        _owned_account_or_403(db, current_user.id, data["account_id"])
    if "category_id" in data:
        _owned_expense_category_or_error(db, current_user.id, data["category_id"])

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return vendor_response(BillOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{bill_id}", status_code=204)
def delete_bill(bill_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_bill_or_403(db, current_user.id, str(bill_id))
    now = utcnow()
    row.archived_at = now
    row.updated_at = now
    db.commit()
    return Response(status_code=204)


@router.post("/{bill_id}/payments")
def mark_bill_paid(
    bill_id: UUID,
    payload: BillPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = _owned_bill_or_403(db, current_user.id, str(bill_id))
    if bill.archived_at is not None:
        raise forbidden_error("Not allowed")
    if not bill.is_active:
        raise bill_inactive_for_month_error()

    month = _validate_month_or_422(payload.month)
    actual_cents = bill.budget_cents if payload.actual_cents is None else _validate_non_negative_cents("actual_cents", payload.actual_cents)

    existing = db.scalar(
        select(BillPayment)
        .where(BillPayment.bill_id == bill.id)
        .where(BillPayment.user_id == current_user.id)
        .where(BillPayment.month == month)
    )
    if existing:
        raise bill_already_paid_error()

    payment_date = date.today()
    transaction = Transaction(
        user_id=current_user.id,
        type="expense",
        account_id=bill.account_id,
        category_id=bill.category_id,
        amount_cents=actual_cents,
        date=payment_date,
        merchant=bill.name,
        note=f"Bill payment - {month}",
    )
    db.add(transaction)
    db.flush()

    payment = BillPayment(
        bill_id=bill.id,
        user_id=current_user.id,
        month=month,
        transaction_id=transaction.id,
        actual_cents=actual_cents,
        paid_at=utcnow(),
    )
    db.add(payment)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise bill_already_paid_error() from exc
    db.refresh(payment)
    return vendor_response(BillPaymentOut.model_validate(payment).model_dump(mode="json"), status_code=201)


@router.delete("/{bill_id}/payments/{month}", status_code=204)
def unmark_bill_paid(
    bill_id: UUID,
    month: str = Path(pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = _owned_bill_or_403(db, current_user.id, str(bill_id))
    month = _validate_month_or_422(month)

    payment = db.scalar(
        select(BillPayment)
        .where(BillPayment.bill_id == bill.id)
        .where(BillPayment.user_id == current_user.id)
        .where(BillPayment.month == month)
    )
    if not payment:
        raise forbidden_error("Not allowed")

    transaction = db.scalar(
        select(Transaction)
        .where(Transaction.id == payment.transaction_id)
        .where(Transaction.user_id == current_user.id)
    )
    db.delete(payment)
    if transaction:
        db.delete(transaction)
    db.commit()
    return Response(status_code=204)
