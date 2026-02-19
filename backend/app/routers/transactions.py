from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.pagination import decode_cursor, encode_cursor, parse_date, parse_datetime
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import (
    account_archived_error,
    category_archived_error,
    category_type_mismatch_error,
    forbidden_error,
    invalid_cursor_error,
    invalid_date_range_error,
)
from app.models import Account, Category, Transaction, User
from app.repositories import SQLAlchemyAccountRepository, SQLAlchemyCategoryRepository, SQLAlchemyTransactionRepository
from app.schemas import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _owned_transaction_or_403(db: Session, user_id: str, transaction_id: str) -> Transaction:
    row = SQLAlchemyTransactionRepository(db).get_owned(user_id, transaction_id)
    if not row:
        raise forbidden_error("Not allowed")
    return row


def _owned_account_or_conflict(db: Session, user_id: str, account_id: str) -> Account:
    account = SQLAlchemyAccountRepository(db).get_owned(user_id, account_id)
    if not account:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    if account.archived_at is not None:
        raise account_archived_error()
    return account


def _owned_category_or_conflict(db: Session, user_id: str, category_id: str) -> Category:
    category = SQLAlchemyCategoryRepository(db).get_owned(user_id, category_id)
    if not category:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    if category.archived_at is not None:
        raise category_archived_error()
    return category


def _validate_business_rules(db: Session, user_id: str, payload: dict):
    account = _owned_account_or_conflict(db, user_id, payload["account_id"])
    category = _owned_category_or_conflict(db, user_id, payload["category_id"])
    if payload["type"] != category.type:
        raise category_type_mismatch_error()
    return account, category


def _apply_list_filters(
    stmt,
    *,
    include_archived: bool,
    type: str | None,
    account_id: str | None,
    category_id: str | None,
    from_: date | None,
    to: date | None,
):
    if not include_archived:
        stmt = stmt.where(Transaction.archived_at.is_(None))
    if type:
        stmt = stmt.where(Transaction.type == type)
    if account_id:
        stmt = stmt.where(Transaction.account_id == account_id)
    if category_id:
        stmt = stmt.where(Transaction.category_id == category_id)
    if from_:
        stmt = stmt.where(Transaction.date >= from_)
    if to:
        stmt = stmt.where(Transaction.date <= to)
    return stmt


def _apply_cursor(stmt, cursor: str):
    data = decode_cursor(cursor)
    c_date_raw = data.get("date")
    c_created_at_raw = data.get("created_at")
    c_id = data.get("id")

    if not isinstance(c_date_raw, str) or not isinstance(c_id, str):
        raise invalid_cursor_error()

    c_date = parse_date(c_date_raw)

    if c_created_at_raw is not None:
        if not isinstance(c_created_at_raw, str):
            raise invalid_cursor_error()
        c_created_at = parse_datetime(c_created_at_raw)
        return stmt.where(
            or_(
                Transaction.date < c_date,
                and_(
                    Transaction.date == c_date,
                    or_(
                        Transaction.created_at < c_created_at,
                        and_(Transaction.created_at == c_created_at, Transaction.id < c_id),
                    ),
                ),
            )
        )

    # Backward compatibility with legacy cursor shape that used date + id.
    return stmt.where(or_(Transaction.date < c_date, and_(Transaction.date == c_date, Transaction.id < c_id)))


def _build_page(rows: list[Transaction], limit: int) -> tuple[list[Transaction], str | None]:
    items = rows[:limit]
    if len(rows) <= limit:
        return items, None
    last = items[-1]
    next_cursor = encode_cursor({"date": last.date.isoformat(), "created_at": last.created_at.isoformat(), "id": last.id})
    return items, next_cursor


@router.get("")
def list_transactions(
    include_archived: bool = Query(default=False),
    type: str | None = Query(default=None),
    account_id: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = Query(default=None),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if from_ and to and from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")

    stmt = select(Transaction).where(Transaction.user_id == current_user.id)
    stmt = _apply_list_filters(
        stmt,
        include_archived=include_archived,
        type=type,
        account_id=account_id,
        category_id=category_id,
        from_=from_,
        to=to,
    )

    if cursor:
        stmt = _apply_cursor(stmt, cursor)

    stmt = stmt.order_by(Transaction.date.desc(), Transaction.created_at.desc(), Transaction.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    items, next_cursor = _build_page(rows, limit)

    payload = {
        "items": [TransactionOut.model_validate(item).model_dump(mode="json") for item in items],
        "next_cursor": next_cursor,
    }
    return vendor_response(payload)


@router.post("")
def create_transaction(payload: TransactionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = SQLAlchemyTransactionRepository(db)
    data = payload.model_dump()
    _validate_business_rules(db, current_user.id, data)
    row = Transaction(user_id=current_user.id, **data)
    repo.add(row)
    db.commit()
    db.refresh(row)
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{transaction_id}")
def get_transaction(transaction_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_transaction_or_403(db, current_user.id, transaction_id)
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{transaction_id}")
def patch_transaction(transaction_id: str, payload: TransactionUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_transaction_or_403(db, current_user.id, transaction_id)
    data = payload.model_dump(exclude_unset=True)
    if any(k in data for k in ["type", "account_id", "category_id"]):
        merged = {
            "type": data.get("type", row.type),
            "account_id": data.get("account_id", row.account_id),
            "category_id": data.get("category_id", row.category_id),
        }
        _validate_business_rules(db, current_user.id, merged)
    else:
        _owned_category_or_conflict(db, current_user.id, row.category_id)

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_transaction_or_403(db, current_user.id, transaction_id)
    row.archived_at = datetime.now(row.created_at.tzinfo)
    row.updated_at = utcnow()
    db.commit()
    return Response(status_code=204)
