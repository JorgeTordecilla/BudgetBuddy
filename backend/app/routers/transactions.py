from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.pagination import decode_cursor, encode_cursor
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.models import Account, Category, Transaction, User
from app.schemas import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _owned_transaction_or_403(db: Session, user_id: str, transaction_id: str) -> Transaction:
    row = db.scalar(select(Transaction).where(and_(Transaction.id == transaction_id, Transaction.user_id == user_id)))
    if not row:
        raise APIError(status=403, title="Forbidden", detail="Not allowed")
    return row


def _owned_account_or_conflict(db: Session, user_id: str, account_id: str) -> Account:
    account = db.scalar(select(Account).where(and_(Account.id == account_id, Account.user_id == user_id)))
    if not account or account.archived_at is not None:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    return account


def _owned_category_or_conflict(db: Session, user_id: str, category_id: str) -> Category:
    category = db.scalar(select(Category).where(and_(Category.id == category_id, Category.user_id == user_id)))
    if not category or category.archived_at is not None:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    return category


def _validate_business_rules(db: Session, user_id: str, payload: dict):
    account = _owned_account_or_conflict(db, user_id, payload["account_id"])
    category = _owned_category_or_conflict(db, user_id, payload["category_id"])
    if payload["type"] != category.type:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    return account, category


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
    stmt = select(Transaction).where(Transaction.user_id == current_user.id)
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

    if cursor:
        data = decode_cursor(cursor)
        c_date = date.fromisoformat(data["date"])
        c_id = data["id"]
        stmt = stmt.where(or_(Transaction.date < c_date, and_(Transaction.date == c_date, Transaction.id < c_id)))

    stmt = stmt.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = None
    if has_more:
        last = items[-1]
        next_cursor = encode_cursor({"date": last.date.isoformat(), "id": last.id})

    payload = {
        "items": [TransactionOut.model_validate(item).model_dump(mode="json") for item in items],
        "next_cursor": next_cursor,
    }
    return vendor_response(payload)


@router.post("")
def create_transaction(payload: TransactionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump()
    _validate_business_rules(db, current_user.id, data)
    row = Transaction(user_id=current_user.id, **data)
    db.add(row)
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
