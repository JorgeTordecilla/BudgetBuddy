import hashlib
import json
import logging
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from threading import Condition, Lock, Thread
from time import monotonic
from typing import Callable, Literal
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import APIError, sanitize_problem_detail
from app.core.utils import utcnow
from app.db import SessionLocal
from app.errors import rate_limited_error
from app.repositories import SQLAlchemyUserRepository
from app.schemas import (
    TransactionImportJobOut,
    TransactionImportRequest,
    TransactionImportResult,
)
from app.transactions.import_sync import execute_import_payload

_IMPORT_LOGGER = logging.getLogger("app.import_jobs")


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


@dataclass
class _IdempotencyRecord:
    digest: str
    job_id: str
    created_at: datetime


class _ImportJobManager:
    def __init__(
        self,
        *,
        per_user_limit: int,
        queue_limit: int,
        worker_count: int,
        terminal_ttl_seconds: int,
        idempotency_ttl_seconds: int,
        retained_terminal_cap: int,
        now_fn: Callable[[], datetime] = utcnow,
    ) -> None:
        self._per_user_limit = max(1, per_user_limit)
        self._queue_limit = max(1, queue_limit)
        self._worker_count = max(0, worker_count)
        self._terminal_ttl_seconds = max(1, terminal_ttl_seconds)
        self._idempotency_ttl_seconds = max(1, idempotency_ttl_seconds)
        self._retained_terminal_cap = max(1, retained_terminal_cap)
        self._now = now_fn
        self._lock = Lock()
        self._condition = Condition(self._lock)
        self._jobs: dict[str, _ImportJobRecord] = {}
        self._queue: deque[str] = deque()
        self._active_per_user: dict[str, int] = {}
        self._idempotency: dict[tuple[str, str], _IdempotencyRecord] = {}
        self._idempotency_by_job: dict[str, set[tuple[str, str]]] = {}
        self._running = 0
        self._workers_started = False
        self._workers: list[Thread] = []
        self._stop_requested = False

    def start_workers(self) -> None:
        with self._condition:
            self._workers = [worker for worker in self._workers if worker.is_alive()]
            if self._workers_started and self._workers:
                return
            self._stop_requested = False
            self._workers_started = True
            for index in range(self._worker_count):
                thread = Thread(target=self._worker_loop, name=f"import-job-worker-{index + 1}", daemon=False)
                thread.start()
                self._workers.append(thread)

    def shutdown(self, *, timeout_seconds: float = 5.0) -> None:
        timeout = max(0.0, float(timeout_seconds))
        with self._condition:
            if not self._workers_started and not self._workers:
                return
            self._stop_requested = True
            workers = list(self._workers)
            self._condition.notify_all()

        deadline = monotonic() + timeout
        for worker in workers:
            remaining = max(0.0, deadline - monotonic())
            worker.join(timeout=remaining)

        still_alive = [worker.name for worker in workers if worker.is_alive()]
        with self._condition:
            self._workers = [worker for worker in workers if worker.is_alive()]
            self._workers_started = bool(self._workers)
            if not self._workers:
                self._stop_requested = False

        _IMPORT_LOGGER.info(
            "event=import_job_workers_shutdown requested=%s joined=%s alive=%s timeout_seconds=%s",
            len(workers),
            len(workers) - len(still_alive),
            len(still_alive),
            timeout,
        )

    def _payload_digest(self, payload: TransactionImportRequest) -> str:
        raw = json.dumps(payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _is_terminal(self, job: _ImportJobRecord) -> bool:
        return job.status in {"completed", "failed"} and job.completed_at is not None

    def _remove_idempotency_ref_locked(self, key: tuple[str, str]) -> bool:
        ref = self._idempotency.pop(key, None)
        if ref is None:
            return False
        refs = self._idempotency_by_job.get(ref.job_id)
        if refs is not None:
            refs.discard(key)
            if not refs:
                self._idempotency_by_job.pop(ref.job_id, None)
        return True

    def _remove_job_locked(self, job_id: str) -> tuple[bool, int]:
        removed_job = self._jobs.pop(job_id, None)
        if removed_job is None:
            return False, 0
        idempotency_keys = self._idempotency_by_job.pop(job_id, set())
        removed_idempotency = 0
        for key in idempotency_keys:
            if key in self._idempotency:
                self._idempotency.pop(key, None)
                removed_idempotency += 1
        return True, removed_idempotency

    def _cleanup_locked(self, *, now: datetime | None = None) -> None:
        current = now or self._now()
        terminal_cutoff = current - timedelta(seconds=self._terminal_ttl_seconds)
        idempotency_cutoff = current - timedelta(seconds=self._idempotency_ttl_seconds)

        if self._queue:
            self._queue = deque(
                job_id
                for job_id in self._queue
                if (job := self._jobs.get(job_id)) is not None and job.status == "queued"
            )

        jobs_evicted = 0
        idempotency_evicted = 0

        expired_job_ids = [
            job_id
            for job_id, job in self._jobs.items()
            if self._is_terminal(job) and job.completed_at is not None and job.completed_at <= terminal_cutoff
        ]
        for job_id in expired_job_ids:
            removed, removed_refs = self._remove_job_locked(job_id)
            if removed:
                jobs_evicted += 1
            idempotency_evicted += removed_refs

        terminal_jobs = [job for job in self._jobs.values() if self._is_terminal(job)]
        overflow = len(terminal_jobs) - self._retained_terminal_cap
        if overflow > 0:
            terminal_jobs.sort(
                key=lambda job: (
                    job.completed_at or job.created_at,
                    job.created_at,
                    job.job_id,
                )
            )
            for job in terminal_jobs[:overflow]:
                removed, removed_refs = self._remove_job_locked(job.job_id)
                if removed:
                    jobs_evicted += 1
                idempotency_evicted += removed_refs

        stale_idempotency_keys = [
            key
            for key, ref in self._idempotency.items()
            if ref.created_at <= idempotency_cutoff or ref.job_id not in self._jobs
        ]
        for key in stale_idempotency_keys:
            if self._remove_idempotency_ref_locked(key):
                idempotency_evicted += 1

        if jobs_evicted or idempotency_evicted:
            _IMPORT_LOGGER.info(
                "event=import_job_cleanup jobs_evicted=%s idempotency_evicted=%s retained_jobs=%s retained_idempotency=%s queue_depth=%s running=%s",
                jobs_evicted,
                idempotency_evicted,
                len(self._jobs),
                len(self._idempotency),
                len(self._queue),
                self._running,
            )

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
            now = self._now()
            self._cleanup_locked(now=now)
            if self._stop_requested:
                raise rate_limited_error("Import workers are shutting down, retry later", retry_after=1)
            if normalized_key:
                lookup_key = (user_id, normalized_key)
                idempotency_ref = self._idempotency.get(lookup_key)
                if idempotency_ref:
                    if idempotency_ref.digest != payload_digest:
                        raise APIError(
                            status=409,
                            title="Conflict",
                            detail="Idempotency-Key was reused with a different payload",
                        )
                    existing = self._jobs.get(idempotency_ref.job_id)
                    if existing is not None:
                        return existing, True
                    self._remove_idempotency_ref_locked(lookup_key)

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
                created_at=now,
            )
            self._jobs[job.job_id] = job
            self._queue.append(job.job_id)
            self._active_per_user[user_id] = self._active_per_user.get(user_id, 0) + 1
            if normalized_key:
                idempotency_key_ref = (user_id, normalized_key)
                self._idempotency[idempotency_key_ref] = _IdempotencyRecord(
                    digest=payload_digest,
                    job_id=job.job_id,
                    created_at=now,
                )
                self._idempotency_by_job.setdefault(job.job_id, set()).add(idempotency_key_ref)
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
            self._cleanup_locked()
            job = self._jobs.get(job_id)
            if job is None or job.user_id != user_id:
                return None
            return job

    def _worker_loop(self) -> None:
        while True:
            with self._condition:
                self._cleanup_locked()
                while not self._queue and not self._stop_requested:
                    self._condition.wait()
                    self._cleanup_locked()
                if self._stop_requested and not self._queue:
                    return
                if not self._queue:
                    continue
                job_id = self._queue.popleft()
                job = self._jobs.get(job_id)
                if job is None:
                    continue
                job.status = "running"
                job.started_at = self._now()
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
                result = execute_import_payload(payload=payload, current_user=user, db=db, request=None)

            with self._condition:
                current = self._jobs.get(job_id)
                if current is not None:
                    current.status = "completed"
                    current.completed_at = self._now()
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
                    current.completed_at = self._now()
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
                self._cleanup_locked()
                self._condition.notify_all()


def serialize_import_job(job: _ImportJobRecord) -> dict:
    return TransactionImportJobOut(
        job_id=job.job_id,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        result=job.result,
        error_message=job.error_message,
    ).model_dump(mode="json")


IMPORT_JOB_MANAGER = _ImportJobManager(
    per_user_limit=settings.transactions_import_async_per_user_limit,
    queue_limit=settings.transactions_import_async_queue_limit,
    worker_count=settings.transactions_import_async_worker_count,
    terminal_ttl_seconds=settings.transactions_import_async_terminal_ttl_seconds,
    idempotency_ttl_seconds=settings.transactions_import_async_idempotency_ttl_seconds,
    retained_terminal_cap=settings.transactions_import_async_retained_terminal_cap,
)

