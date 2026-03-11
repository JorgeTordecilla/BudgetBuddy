import hashlib
import logging
import math
import time
from dataclasses import dataclass
from threading import Lock
from typing import Protocol

from fastapi import Request

_LOGGER = logging.getLogger("app.rate_limit")


@dataclass
class _BucketState:
    window_start: float
    window_seconds: int
    count: int
    lock_until: float | None = None


class RateLimiter(Protocol):
    def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
        lock_seconds: int = 0,
    ) -> tuple[bool, int | None]: ...


class InMemoryRateLimiter(RateLimiter):
    _PURGE_EVERY = 1000

    def __init__(self, now_fn=None):
        self._now = now_fn or time.time
        self._lock = Lock()
        self._buckets: dict[str, _BucketState] = {}
        self._checks = 0

    def _window_end(self, state: _BucketState) -> float:
        return state.window_start + state.window_seconds

    def _is_bucket_inactive(self, state: _BucketState, now: float) -> bool:
        window_expired = now >= self._window_end(state)
        lock_inactive = state.lock_until is None or now >= state.lock_until
        return window_expired and lock_inactive

    def _purge_inactive_buckets(self, now: float) -> None:
        inactive_keys = [key for key, state in self._buckets.items() if self._is_bucket_inactive(state, now)]
        for key in inactive_keys:
            self._buckets.pop(key, None)

    def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
        lock_seconds: int = 0,
    ) -> tuple[bool, int | None]:
        now = self._now()
        with self._lock:
            self._checks += 1
            if self._checks % self._PURGE_EVERY == 0:
                self._purge_inactive_buckets(now)

            state = self._buckets.get(key)
            if state is None:
                state = _BucketState(window_start=now, window_seconds=window_seconds, count=0)
                self._buckets[key] = state

            if state.lock_until is not None and now < state.lock_until:
                return False, max(1, math.ceil(state.lock_until - now))

            window_end = self._window_end(state)
            if now >= window_end:
                state.window_start = now
                state.window_seconds = window_seconds
                state.count = 0
                if state.lock_until is not None and now >= state.lock_until:
                    state.lock_until = None
                window_end = self._window_end(state)

            if state.count >= limit:
                if lock_seconds > 0:
                    state.lock_until = now + lock_seconds
                    return False, max(1, math.ceil(lock_seconds))
                return False, max(1, math.ceil(window_end - now))

            state.count += 1
            return True, None


def _sanitize_key(key: str) -> str:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return digest[:16]


def log_rate_limited(
    request: Request,
    *,
    endpoint: str,
    key: str,
    retry_after: int | None,
    limit: int,
    window_seconds: int,
) -> None:
    request_id = getattr(request.state, "request_id", "") or "-"
    _LOGGER.warning(
        "event=rate_limited request_id=%s method=%s path=%s endpoint=%s identity_key=%s limit=%s window_seconds=%s retry_after=%s",
        request_id,
        request.method,
        request.url.path,
        endpoint,
        _sanitize_key(key),
        limit,
        window_seconds,
        retry_after or 1,
    )
