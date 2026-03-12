from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import emit_audit_event
from app.core.config import settings
from app.core.constants import CSV_TEXT
from app.core.network import resolve_rate_limit_client_ip
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, log_rate_limited
from app.core.responses import vendor_response
from app.core.utils import utcnow
from app.db import get_db
from app.dependencies import get_current_user
from app.errors import forbidden_error, invalid_date_range_error, rate_limited_error
from app.models import Account, Category, Transaction, User
from app.models.enums import TransactionType
from app.repositories import SQLAlchemyTransactionRepository
from app.schemas import (
    TransactionCreate,
    TransactionImportJobAccepted,
    TransactionImportRequest,
    TransactionOut,
    TransactionUpdate,
)
from app.transactions.csv_export import csv_stream
from app.transactions.import_jobs import (
    IMPORT_JOB_MANAGER,
    _ImportJobManager,
    serialize_import_job,
)
from app.transactions.import_sync import execute_import_payload
from app.transactions.pagination import apply_cursor, apply_list_filters, build_page
from app.transactions.validation import (
    owned_active_income_source_or_conflict,
    owned_category_or_conflict,
    owned_transaction_or_403,
    validate_batch_size_or_400,
    validate_business_rules,
    validate_money_rules,
    validate_transaction_mood,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])
_TRANSACTION_RATE_LIMITER: RateLimiter = InMemoryRateLimiter()
_IMPORT_JOB_MANAGER: _ImportJobManager = IMPORT_JOB_MANAGER


def _transactions_rate_limit_or_429(request: Request, *, endpoint: str, identity: str) -> None:
    window_seconds = max(1, settings.transactions_rate_limit_window_seconds)
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


def start_import_job_workers() -> None:
    _IMPORT_JOB_MANAGER.start_workers()


def shutdown_import_job_workers(*, timeout_seconds: float | None = None) -> None:
    _IMPORT_JOB_MANAGER.shutdown(
        timeout_seconds=(
            settings.transactions_import_async_shutdown_timeout_seconds
            if timeout_seconds is None
            else timeout_seconds
        )
    )


def _get_import_job_manager() -> _ImportJobManager:
    start_import_job_workers()
    return _IMPORT_JOB_MANAGER


@router.get("")
def list_transactions(
    include_archived: bool = Query(default=False),
    type: TransactionType | None = Query(default=None),
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
    stmt = apply_list_filters(
        stmt,
        include_archived=include_archived,
        type=type,
        account_id=account_id,
        category_id=category_id,
        from_=from_,
        to=to,
    )

    if cursor:
        stmt = apply_cursor(stmt, cursor)

    stmt = stmt.order_by(Transaction.date.desc(), Transaction.created_at.desc(), Transaction.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    items, next_cursor = build_page(rows, limit)

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
    validate_transaction_mood(data)
    data["amount_cents"] = validate_money_rules(current_user, data["type"], data["amount_cents"])
    validate_business_rules(db, current_user.id, data)
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
        identity=f"{current_user.id}:{resolve_rate_limit_client_ip(request)}",
    )
    validate_batch_size_or_400(len(payload.items))
    result = execute_import_payload(
        payload=payload,
        current_user=current_user,
        db=db,
        request=request,
    )
    return vendor_response(result.model_dump(mode="json"))


@router.post("/import/jobs")
def submit_import_job(
    payload: TransactionImportRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    _transactions_rate_limit_or_429(
        request,
        endpoint="transactions_import",
        identity=f"{current_user.id}:{resolve_rate_limit_client_ip(request)}",
    )
    validate_batch_size_or_400(len(payload.items))

    manager = _get_import_job_manager()
    job, reused = manager.submit(
        user_id=current_user.id,
        payload=payload,
        idempotency_key=idempotency_key,
    )
    body = TransactionImportJobAccepted(
        job_id=job.job_id,
        status=job.status,
        idempotency_reused=reused,
    )
    return vendor_response(body.model_dump(mode="json"), status_code=202)


@router.get("/import/jobs/{job_id}")
def get_import_job_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
):
    manager = _get_import_job_manager()
    job = manager.get_for_user(user_id=current_user.id, job_id=str(job_id))
    if job is None:
        raise forbidden_error("Not allowed")
    return vendor_response(serialize_import_job(job))


@router.get("/export")
def export_transactions(
    request: Request,
    type: TransactionType | None = Query(default=None),
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
        identity=f"{current_user.id}:{resolve_rate_limit_client_ip(request)}",
    )
    if from_ and to and from_ > to:
        raise invalid_date_range_error("from must be less than or equal to to")

    stmt = (
        select(Transaction, Account.name, Category.name)
        .join(Account, Transaction.account_id == Account.id)
        .join(Category, Transaction.category_id == Category.id)
        .where(Transaction.user_id == current_user.id)
    )
    stmt = apply_list_filters(
        stmt,
        include_archived=False,
        type=type,
        account_id=account_id,
        category_id=category_id,
        from_=from_,
        to=to,
    )
    stmt = stmt.order_by(Transaction.date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
    rows = db.execute(stmt)

    return StreamingResponse(
        csv_stream(rows),
        media_type=CSV_TEXT,
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.get("/{transaction_id}")
def get_transaction(transaction_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = owned_transaction_or_403(db, current_user.id, str(transaction_id))
    return vendor_response(TransactionOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{transaction_id}")
def patch_transaction(
    transaction_id: UUID,
    payload: TransactionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = owned_transaction_or_403(db, current_user.id, str(transaction_id))
    previous_archived_at = row.archived_at
    data = payload.model_dump(exclude_unset=True)
    validate_transaction_mood(data)
    merged_type: TransactionType = data.get("type", row.type)
    merged_amount = data.get("amount_cents", row.amount_cents)
    validate_money_rules(current_user, merged_type, merged_amount)

    if any(k in data for k in ["type", "account_id", "category_id", "income_source_id"]):
        merged = {
            "type": merged_type,
            "account_id": data.get("account_id", row.account_id),
            "category_id": data.get("category_id", row.category_id),
            "income_source_id": data.get("income_source_id", row.income_source_id),
        }
        validate_business_rules(db, current_user.id, merged)
    else:
        owned_category_or_conflict(db, current_user.id, row.category_id)
        if row.income_source_id is not None:
            owned_active_income_source_or_conflict(db, current_user.id, row.income_source_id)

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
    row = owned_transaction_or_403(db, current_user.id, str(transaction_id))
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
