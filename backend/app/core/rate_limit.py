import math
import time
from dataclasses import dataclass
from threading import Lock
from typing import Protocol


@dataclass
class _BucketState:
    window_start: float
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
    def __init__(self, now_fn=None):
        self._now = now_fn or time.time
        self._lock = Lock()
        self._buckets: dict[str, _BucketState] = {}

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
            state = self._buckets.get(key)
            if state is None:
                state = _BucketState(window_start=now, count=0)
                self._buckets[key] = state

            if state.lock_until is not None and now < state.lock_until:
                return False, max(1, math.ceil(state.lock_until - now))

            window_end = state.window_start + window_seconds
            if now >= window_end:
                state.window_start = now
                state.count = 0
                if state.lock_until is not None and now >= state.lock_until:
                    state.lock_until = None
                window_end = state.window_start + window_seconds

            if state.count >= limit:
                if lock_seconds > 0:
                    state.lock_until = now + lock_seconds
                    return False, max(1, math.ceil(lock_seconds))
                return False, max(1, math.ceil(window_end - now))

            state.count += 1
            return True, None
