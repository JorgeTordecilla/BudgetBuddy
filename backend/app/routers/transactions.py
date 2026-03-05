import hashlib
import json
import logging
import csv
import io
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime
from threading import Condition, Lock, Thread
from typing import Iterator, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.audit import emit_audit_event
from app.core.constants import CSV_TEXT
from app.core.errors import APIError, sanitize_problem_detail
from app.core.network import resolve_rate_limit_client_ip
from app.core.money import validate_amount_cents, validate_user_currency_for_money
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, log_rate_limited
from app.core.pagination import decode_cursor, encode_cursor, parse_date, parse_datetime
from app.core.responses import vendor_response
from app.db import SessionLocal, get_db
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
    transaction_mood_invalid_error,
)
from app.models import Account, Category, Transaction, User
from app.repositories import (
    SQLAlchemyAccountRepository,
    SQLAlchemyCategoryRepository,
    SQLAlchemyIncomeSourceRepository,
    SQLAlchemyTransactionRepository,
    SQLAlchemyUserRepository,
)
from app.schemas import (
    TransactionCreate,
    TransactionImportJobAccepted,
    TransactionImportJobOut,
    TransactionImportFailure,
    TransactionImportRequest,
    TransactionImportResult,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])
_TRANSACTION_RATE_LIMITER: RateLimiter = InMemoryRateLimiter()
_VALID_TRANSACTION_MOODS = {"happy", "neutral", "sad", "anxious", "bored"}
_IMPORT_LOGGER = logging.getLogger("app.import_jobs")


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


def _owned_active_income_source_or_conflict(db: Session, user_id: str, income_source_id: str):
    income_source = SQLAlchemyIncomeSourceRepository(db).get_owned(user_id, income_source_id)
    if not income_source:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    if income_source.archived_at is not None:
        raise APIError(status=409, title="Conflict", detail="Business rule conflict")
    return income_source


def _validate_income_source_rule(db: Session, user_id: str, payload: dict) -> None:
    income_source_id = payload.get("income_source_id")
    if payload["type"] == "expense":
        if income_source_id is not None:
            raise APIError(status=400, title="Invalid request", detail="income_source_id is only allowed for income transactions")
        return
    if income_source_id is None:
        return
    _owned_active_income_source_or_conflict(db, user_id, income_source_id)


def _validate_business_rules(db: Session, user_id: str, payload: dict):
    account = _owned_account_or_conflict(db, user_id, payload["account_id"])
    category = _owned_category_or_conflict(db, user_id, payload["category_id"])
    if payload["type"] != category.type:
        raise category_type_mismatch_error()
    _validate_income_source_rule(db, user_id, payload)
    return account, category


def _validate_transaction_mood(payload: dict) -> None:
    mood = payload.get("mood")
    if mood is None:
        return
    if mood not in _VALID_TRANSACTION_MOODS:
        raise transaction_mood_invalid_error("mood must be one of: happy, neutral, sad, anxious, bored")


def _validate_money_rules(user: User, tx_type: Literal["income", "expense"], amount_cents: object) -> int:
    validate_user_currency_for_money(user.currency_code)
    return validate_amount_cents(amount_cents, tx_type)


def _validate_batch_size_or_400(item_count: int) -> None:
    if item_count > settings.transaction_import_max_items:
        raise import_batch_limit_exceeded_error(
            f"items exceeds maximum batch size ({settings.transaction_import_max_items})"
        )


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


def _execute_import_payload(
    *,
    payload: TransactionImportRequest,
    current_user: User,
    db: Session,
    request: Request | None,
) -> TransactionImportResult:
    mode = payload.mode
    failures: list[TransactionImportFailure] = []
    rows_to_insert: list[Transaction] = []

    for index, item in enumerate(payload.items):
        try:
            data = item.model_dump()
            _validate_transaction_mood(data)
            data["amount_cents"] = _validate_money_rules(current_user, data["type"], data["amount_cents"])
            _validate_business_rules(db, current_user.id, data)
            rows_to_insert.append(Transaction(user_id=current_user.id, **data))
        except Exception as exc:
            failures.append(_build_import_failure(index, exc))

    if mode == "all_or_nothing" and failures:
        return TransactionImportResult(created_count=0, failed_count=len(failures), failures=failures)

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

    return TransactionImportResult(
        created_count=len(rows_to_insert),
        failed_count=len(failures),
        failures=failures,
    )


@dataclass
class _ImportJobRecord:
    job_id: str
    user_id: str
    payload: TransactionImportRequest
    status: Literal["queued", "running", "completed", "failed"]
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    result: TransactionImportResult | None = None
    error_message: str | None = None


class _ImportJobManager:
    def __init__(self, *, per_user_limit: int, queue_limit: int, worker_count: int) -> None:
        self._per_user_limit = max(1, per_user_limit)
        self._queue_limit = max(1, queue_limit)
        self._worker_count = max(0, worker_count)
        self._lock = Lock()
        self._condition = Condition(self._lock)
        self._jobs: dict[str, _ImportJobRecord] = {}
        self._queue: deque[str] = deque()
        self._active_per_user: dict[str, int] = {}
        self._idempotency: dict[tuple[str, str], tuple[str, str]] = {}
        self._running = 0
        self._workers_started = False

    def start_workers(self) -> None:
        with self._condition:
            if self._workers_started:
                return
            self._workers_started = True
            for index in range(self._worker_count):
                thread = Thread(target=self._worker_loop, name=f"import-job-worker-{index + 1}", daemon=True)
                thread.start()

    def _payload_digest(self, payload: TransactionImportRequest) -> str:
        raw = json.dumps(payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def submit(
        self,
        *,
        user_id: str,
        payload: TransactionImportRequest,
        idempotency_key: str | None,
    ) -> tuple[_ImportJobRecord, bool]:
        payload_copy = payload.model_copy(deep=True)
        normalized_key = (idempotency_key or "").strip()
        payload_digest = self._payload_digest(payload_copy)

        with self._condition:
            if normalized_key:
                idempotency_ref = self._idempotency.get((user_id, normalized_key))
                if idempotency_ref:
                    known_digest, known_job_id = idempotency_ref
                    if known_digest != payload_digest:
                        raise APIError(
                            status=409,
                            title="Conflict",
                            detail="Idempotency-Key was reused with a different payload",
                        )
                    existing = self._jobs.get(known_job_id)
                    if existing is not None:
                        return existing, True

            if self._active_per_user.get(user_id, 0) >= self._per_user_limit:
                _IMPORT_LOGGER.warning(
                    "event=import_job_rejected reason=per_user_limit user_id=%s queue_depth=%s running=%s",
                    user_id,
                    len(self._queue),
                    self._running,
                )
                raise rate_limited_error("Too many active import jobs for this user", retry_after=1)

            if len(self._queue) + self._running >= self._queue_limit:
                _IMPORT_LOGGER.warning(
                    "event=import_job_rejected reason=queue_limit user_id=%s queue_depth=%s running=%s",
                    user_id,
                    len(self._queue),
                    self._running,
                )
                raise rate_limited_error("Import queue is full, retry later", retry_after=1)

            job = _ImportJobRecord(
                job_id=str(uuid4()),
                user_id=user_id,
                payload=payload_copy,
                status="queued",
                created_at=utcnow(),
            )
            self._jobs[job.job_id] = job
            self._queue.append(job.job_id)
            self._active_per_user[user_id] = self._active_per_user.get(user_id, 0) + 1
            if normalized_key:
                self._idempotency[(user_id, normalized_key)] = (payload_digest, job.job_id)
            self._condition.notify()

            _IMPORT_LOGGER.info(
                "event=import_job_accepted job_id=%s user_id=%s queue_depth=%s running=%s active_user=%s",
                job.job_id,
                user_id,
                len(self._queue),
                self._running,
                self._active_per_user[user_id],
            )
            return job, False

    def get_for_user(self, *, user_id: str, job_id: str) -> _ImportJobRecord | None:
        with self._condition:
            job = self._jobs.get(job_id)
            if job is None or job.user_id != user_id:
                return None
            return job

    def _worker_loop(self) -> None:
        while True:
            with self._condition:
                while not self._queue:
                    self._condition.wait()
                job_id = self._queue.popleft()
                job = self._jobs.get(job_id)
                if job is None:
                    continue
                job.status = "running"
                job.started_at = utcnow()
                self._running += 1
            self._process_job(job_id)

    def _process_job(self, job_id: str) -> None:
        try:
            with self._condition:
                job = self._jobs.get(job_id)
                if job is None:
                    return
                user_id = job.user_id
                payload = job.payload.model_copy(deep=True)

            with SessionLocal() as db:
                user = SQLAlchemyUserRepository(db).get_by_id(user_id)
                if user is None:
                    raise APIError(status=403, title="Forbidden", detail="User no longer exists")
                result = _execute_import_payload(payload=payload, current_user=user, db=db, request=None)

            with self._condition:
                current = self._jobs.get(job_id)
                if current is not None:
                    current.status = "completed"
                    current.completed_at = utcnow()
                    current.result = result
                    current.error_message = None
        except Exception as exc:
            if isinstance(exc, APIError):
                message = sanitize_problem_detail(exc.detail) or exc.title
            else:
                message = "Import job failed"
            with self._condition:
                current = self._jobs.get(job_id)
                if current is not None:
                    current.status = "failed"
                    current.completed_at = utcnow()
                    current.error_message = message
        finally:
            with self._condition:
                current = self._jobs.get(job_id)
                if current is not None:
                    active = self._active_per_user.get(current.user_id, 0)
                    if active <= 1:
                        self._active_per_user.pop(current.user_id, None)
                    else:
                        self._active_per_user[current.user_id] = active - 1
                    _IMPORT_LOGGER.info(
                        "event=import_job_finished job_id=%s user_id=%s status=%s queue_depth=%s running=%s",
                        current.job_id,
                        current.user_id,
                        current.status,
                        len(self._queue),
                        max(0, self._running - 1),
                    )
                self._running = max(0, self._running - 1)
                self._condition.notify_all()


_IMPORT_JOB_MANAGER = _ImportJobManager(
    per_user_limit=settings.transactions_import_async_per_user_limit,
    queue_limit=settings.transactions_import_async_queue_limit,
    worker_count=settings.transactions_import_async_worker_count,
)


def _get_import_job_manager() -> _ImportJobManager:
    _IMPORT_JOB_MANAGER.start_workers()
    return _IMPORT_JOB_MANAGER


def _serialize_import_job(job: _ImportJobRecord) -> dict:
    return TransactionImportJobOut(
        job_id=job.job_id,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        result=job.result,
        error_message=job.error_message,
    ).model_dump(mode="json")


def _csv_line(cells: list[object]) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(cells)
    return out.getvalue()


def _sanitize_csv_text_cell(value: str) -> str:
    if value.lstrip().startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def _csv_stream(rows) -> Iterator[str]:
    header = [
        "date",
        "type",
        "account",
        "category",
        "amount_cents",
        "merchant",
        "note",
        "mood",
        "is_impulse",
    ]
    yield _csv_line(header)
    for tx, account_name, category_name in rows:
        account = _sanitize_csv_text_cell(account_name or "")
        category = _sanitize_csv_text_cell(category_name or "")
        merchant = _sanitize_csv_text_cell(tx.merchant or "")
        note = _sanitize_csv_text_cell(tx.note or "")
        yield _csv_line(
            [
                tx.date.isoformat(),
                tx.type,
                account,
                category,
                tx.amount_cents,
                merchant,
                note,
                tx.mood or "",
                "" if tx.is_impulse is None else str(tx.is_impulse).lower(),
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
    _validate_transaction_mood(data)
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
        identity=f"{current_user.id}:{resolve_rate_limit_client_ip(request)}",
    )
    _validate_batch_size_or_400(len(payload.items))
    result = _execute_import_payload(
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
    _validate_batch_size_or_400(len(payload.items))

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
    return vendor_response(_serialize_import_job(job))


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
    rows = db.execute(stmt)

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
    _validate_transaction_mood(data)
    merged_type: Literal["income", "expense"] = data.get("type", row.type)
    merged_amount = data.get("amount_cents", row.amount_cents)
    _validate_money_rules(current_user, merged_type, merged_amount)

    if any(k in data for k in ["type", "account_id", "category_id", "income_source_id"]):
        merged = {
            "type": merged_type,
            "account_id": data.get("account_id", row.account_id),
            "category_id": data.get("category_id", row.category_id),
            "income_source_id": data.get("income_source_id", row.income_source_id),
        }
        _validate_business_rules(db, current_user.id, merged)
    else:
        _owned_category_or_conflict(db, current_user.id, row.category_id)
        if row.income_source_id is not None:
            _owned_active_income_source_or_conflict(db, current_user.id, row.income_source_id)

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
