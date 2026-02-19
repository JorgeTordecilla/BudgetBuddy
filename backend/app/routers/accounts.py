from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import forbidden_error
from app.models import Account, User
from app.repositories import SQLAlchemyAccountRepository
from app.routers._crud_common import apply_created_cursor, build_created_cursor_page, commit_or_conflict
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
        stmt = apply_created_cursor(stmt, cursor, Account)

    stmt = stmt.order_by(Account.created_at.desc(), Account.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    items, next_cursor = build_created_cursor_page(rows, limit)

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
    commit_or_conflict(db, "Account name already exists")
    db.refresh(row)
    return vendor_response(AccountOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{account_id}")
def get_account(account_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = _owned_account_or_403(db, current_user.id, str(account_id))
    return vendor_response(AccountOut.model_validate(account).model_dump(mode="json"))


@router.patch("/{account_id}")
def patch_account(
    account_id: UUID,
    payload: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _owned_account_or_403(db, current_user.id, str(account_id))
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    account.updated_at = utcnow()
    commit_or_conflict(db, "Account name already exists")
    db.refresh(account)
    return vendor_response(AccountOut.model_validate(account).model_dump(mode="json"))


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = _owned_account_or_403(db, current_user.id, str(account_id))
    now = utcnow()
    account.archived_at = now
    account.updated_at = now
    db.commit()
    return Response(status_code=204)
