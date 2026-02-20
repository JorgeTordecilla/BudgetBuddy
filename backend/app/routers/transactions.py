import csv
import io
from datetime import date
from typing import Iterator, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.audit import emit_audit_event
from app.core.constants import CSV_TEXT
from app.core.errors import APIError, sanitize_problem_detail
from app.core.money import validate_amount_cents, validate_user_currency_for_money
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, log_rate_limited
from app.core.pagination import decode_cursor, encode_cursor, parse_date, parse_datetime
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import (
    account_archived_error,
    category_archived_error,
    category_type_mismatch_error,
    forbidden_error,
    import_batch_limit_exceeded_error,
    invalid_cursor_error,
    invalid_date_range_error,
    rate_limited_error,
)
from app.models import Account, Category, Transaction, User
from app.repositories import SQLAlchemyAccountRepository, SQLAlchemyCategoryRepository, SQLAlchemyTransactionRepository
from app.schemas import (
    TransactionCreate,
    TransactionImportFailure,
    TransactionImportRequest,
    TransactionImportResult,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])
_TRANSACTION_RATE_LIMITER: RateLimiter = InMemoryRateLimiter()


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


def _validate_money_rules(user: User, tx_type: Literal["income", "expense"], amount_cents: object) -> int:
    validate_user_currency_for_money(user.currency_code)
    return validate_amount_cents(amount_cents, tx_type)


def _validate_batch_size_or_400(item_count: int) -> None:
    if item_count > settings.transaction_import_max_items:
        raise import_batch_limit_exceeded_error(
            f"items exceeds maximum batch size ({settings.transaction_import_max_items})"
        )


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if forwarded:
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _transactions_rate_limit_or_429(request: Request, *, endpoint: str, identity: str) -> None:
    window_seconds = max(1, settings.auth_rate_limit_window_seconds)
    if endpoint == "transactions_import":
        limit = max(1, settings.transactions_import_rate_limit_per_minute)
    else:
        limit = max(1, settings.transactions_export_rate_limit_per_minute)
    key = f"{endpoint}:{identity}"
    allowed, retry_after = _TRANSACTION_RATE_LIMITER.check(
        key,
        limit=limit,
        window_seconds=window_seconds,
    )
    if not allowed:
        log_rate_limited(
            request,
            endpoint=endpoint,
            key=key,
            retry_after=retry_after,
            limit=limit,
            window_seconds=window_seconds,
        )
        raise rate_limited_error("Too many requests, retry later", retry_after=retry_after)


def _build_import_failure(index: int, exc: Exception) -> TransactionImportFailure:
    if isinstance(exc, APIError):
        return TransactionImportFailure(
            index=index,
            message=sanitize_problem_detail(exc.detail) or exc.title,
            problem={"type": exc.type_, "title": exc.title, "status": exc.status},
        )
    return TransactionImportFailure(index=index, message="Import row failed validation")


def _csv_line(cells: list[object]) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(cells)
    return out.getvalue()


def _csv_stream(rows) -> Iterator[str]:
    header = [
        "id",
        "type",
        "account_id",
        "category_id",
        "amount_cents",
        "date",
        "merchant",
        "note",
        "archived_at",
        "created_at",
        "updated_at",
    ]
    yield _csv_line(header)
    for row in rows:
        yield _csv_line(
            [
                row.id,
                row.type,
                row.account_id,
                row.category_id,
                row.amount_cents,
                row.date.isoformat(),
                row.merchant or "",
                row.note or "",
                row.archived_at.isoformat() if row.archived_at else "",
                row.created_at.isoformat(),
                row.updated_at.isoformat(),
            ]
        )


def _apply_list_filters(
    stmt,
    *,
    include_archived: bool,
    type: Literal["income", "expense"] | None,
    account_id: UUID | None,
    category_id: UUID | None,
    from_: date | None,
    to: date | None,
):
    if not include_archived:
        stmt = stmt.where(Transaction.archived_at.is_(None))
    if type:
        stmt = stmt.where(Transaction.type == type)
    if account_id:
        stmt = stmt.where(Transaction.account_id == str(account_id))
    if category_id:
        stmt = stmt.where(Transaction.category_id == str(category_id))
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
    type: Literal["income", "expense"] | None = Query(default=None),
    account_id: UUID | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
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
def create_transaction(
    payload: TransactionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyTransactionRepository(db)
    data = payload.model_dump()
    data["amount_cents"] = _validate_money_rules(current_user, data["type"], data["amount_cents"])
    _validate_business_rules(db, current_user.id, data)
    row = Transaction(user_id=current_user.id, **data)
    repo.add(row)
    db.flush()
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="transaction",
        resource_id=row.id,
        action="transaction.create",
    )
    db.commit()
    db.refresh(row)
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.post("/import")
def import_transactions(
    payload: TransactionImportRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _transactions_rate_limit_or_429(
        request,
        endpoint="transactions_import",
        identity=f"{current_user.id}:{_client_ip(request)}",
    )
    _validate_batch_size_or_400(len(payload.items))
    mode = payload.mode
    failures: list[TransactionImportFailure] = []
    rows_to_insert: list[Transaction] = []

    for index, item in enumerate(payload.items):
        try:
            data = item.model_dump()
            data["amount_cents"] = _validate_money_rules(current_user, data["type"], data["amount_cents"])
            _validate_business_rules(db, current_user.id, data)
            rows_to_insert.append(Transaction(user_id=current_user.id, **data))
        except Exception as exc:
            failures.append(_build_import_failure(index, exc))

    if mode == "all_or_nothing" and failures:
        result = TransactionImportResult(created_count=0, failed_count=len(failures), failures=failures)
        return vendor_response(result.model_dump(mode="json"))

    for row in rows_to_insert:
        db.add(row)
    if rows_to_insert:
        db.flush()
        for row in rows_to_insert:
            emit_audit_event(
                db,
                request=request,
                user_id=current_user.id,
                resource_type="transaction",
                resource_id=row.id,
                action="transaction.create",
            )
        db.commit()

    result = TransactionImportResult(
        created_count=len(rows_to_insert),
        failed_count=len(failures),
        failures=failures,
    )
    return vendor_response(result.model_dump(mode="json"))


@router.get("/export")
def export_transactions(
    request: Request,
    type: Literal["income", "expense"] | None = Query(default=None),
    account_id: UUID | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _transactions_rate_limit_or_429(
        request,
        endpoint="transactions_export",
        identity=f"{current_user.id}:{_client_ip(request)}",
    )
    if from_ and to and from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")

    stmt = select(Transaction).where(Transaction.user_id == current_user.id)
    stmt = _apply_list_filters(
        stmt,
        include_archived=False,
        type=type,
        account_id=account_id,
        category_id=category_id,
        from_=from_,
        to=to,
    )
    stmt = stmt.order_by(Transaction.date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
    rows = db.scalars(stmt)

    return StreamingResponse(
        _csv_stream(rows),
        media_type=CSV_TEXT,
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.get("/{transaction_id}")
def get_transaction(transaction_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_transaction_or_403(db, current_user.id, str(transaction_id))
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{transaction_id}")
def patch_transaction(
    transaction_id: UUID,
    payload: TransactionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_transaction_or_403(db, current_user.id, str(transaction_id))
    previous_archived_at = row.archived_at
    data = payload.model_dump(exclude_unset=True)
    merged_type: Literal["income", "expense"] = data.get("type", row.type)
    merged_amount = data.get("amount_cents", row.amount_cents)
    _validate_money_rules(current_user, merged_type, merged_amount)

    if any(k in data for k in ["type", "account_id", "category_id"]):
        merged = {
            "type": merged_type,
            "account_id": data.get("account_id", row.account_id),
            "category_id": data.get("category_id", row.category_id),
        }
        _validate_business_rules(db, current_user.id, merged)
    else:
        _owned_category_or_conflict(db, current_user.id, row.category_id)

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = utcnow()
    action = "transaction.restore" if previous_archived_at is not None and row.archived_at is None else "transaction.update"
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="transaction",
        resource_id=row.id,
        action=action,
    )
    db.commit()
    db.refresh(row)
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_transaction_or_403(db, current_user.id, str(transaction_id))
    now = utcnow()
    row.archived_at = now
    row.updated_at = now
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="transaction",
        resource_id=row.id,
        action="transaction.archive",
        created_at=now,
    )
    db.commit()
    return Response(status_code=204)
