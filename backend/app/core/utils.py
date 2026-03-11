from datetime import UTC, datetime
from typing import Protocol


class UTCClock(Protocol):
    def now(self) -> datetime: ...


class SystemUTCClock:
    def now(self) -> datetime:
        return datetime.now(tz=UTC)


UTC_CLOCK: UTCClock = SystemUTCClock()


def utcnow() -> datetime:
    return UTC_CLOCK.now()


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
