from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.pagination import decode_cursor, encode_cursor, parse_datetime
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import forbidden_error, invalid_cursor_error
from app.models import Account, User
from app.repositories import SQLAlchemyAccountRepository
from app.schemas import AccountCreate, AccountOut, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _owned_account_or_403(db: Session, user_id: str, account_id: str) -> Account:
    account = SQLAlchemyAccountRepository(db).get_owned(user_id, account_id)
    if not account:
        raise forbidden_error("Not allowed")
    return account


@router.get("")
def list_accounts(
    include_archived: bool = Query(default=False),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Account).where(Account.user_id == current_user.id)
    if not include_archived:
        stmt = stmt.where(Account.archived_at.is_(None))

    if cursor:
        data = decode_cursor(cursor)
        c_created_raw = data.get("created_at")
        c_id = data.get("id")
        if not isinstance(c_created_raw, str) or not isinstance(c_id, str):
            raise invalid_cursor_error()
        c_created = parse_datetime(c_created_raw)
        stmt = stmt.where(or_(Account.created_at < c_created, and_(Account.created_at == c_created, Account.id < c_id)))

    stmt = stmt.order_by(Account.created_at.desc(), Account.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = None
    if has_more:
        last = items[-1]
        next_cursor = encode_cursor({"created_at": last.created_at.isoformat(), "id": last.id})

    payload = {
        "items": [AccountOut.model_validate(item).model_dump(mode="json") for item in items],
        "next_cursor": next_cursor,
    }
    return vendor_response(payload)


@router.post("")
def create_account(payload: AccountCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = SQLAlchemyAccountRepository(db)
    row = Account(user_id=current_user.id, **payload.model_dump())
    repo.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Account name already exists") from exc
    db.refresh(row)
    return vendor_response(AccountOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{account_id}")
def get_account(account_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = _owned_account_or_403(db, current_user.id, account_id)
    return vendor_response(AccountOut.model_validate(account).model_dump(mode="json"))


@router.patch("/{account_id}")
def patch_account(account_id: str, payload: AccountUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = _owned_account_or_403(db, current_user.id, account_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    account.updated_at = utcnow()
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Account name already exists") from exc
    db.refresh(account)
    return vendor_response(AccountOut.model_validate(account).model_dump(mode="json"))


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = _owned_account_or_403(db, current_user.id, account_id)
    account.archived_at = datetime.now(account.created_at.tzinfo)
    account.updated_at = utcnow()
    db.commit()
    return Response(status_code=204)
