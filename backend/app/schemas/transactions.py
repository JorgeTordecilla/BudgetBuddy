from datetime import date as DateType, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.models.enums import TransactionMood, TransactionType
from app.schemas.common import ProblemDetails


class TransactionBase(BaseModel):
    type: TransactionType
    account_id: str
    category_id: str
    income_source_id: str | None = None
    amount_cents: StrictInt
    date: DateType
    merchant: str | None = None
    note: str | None = None
    mood: TransactionMood | None = None
    is_impulse: bool | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    account_id: str | None = None
    category_id: str | None = None
    income_source_id: str | None = None
    amount_cents: StrictInt | None = None
    date: DateType | None = None
    merchant: str | None = None
    note: str | None = None
    mood: TransactionMood | None = None
    is_impulse: bool | None = None
    archived_at: datetime | None = None


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TransactionImportItem(TransactionBase):
    pass


class TransactionImportRequest(BaseModel):
    mode: Literal["all_or_nothing", "partial"] = "partial"
    items: list[TransactionImportItem] = Field(min_length=1)


class TransactionImportFailure(BaseModel):
    index: int = Field(ge=0)
    message: str
    problem: ProblemDetails | None = None


class TransactionImportResult(BaseModel):
    created_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)
    failures: list[TransactionImportFailure]


class TransactionImportJobAccepted(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    idempotency_reused: bool


class TransactionImportJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    result: TransactionImportResult | None = None
    error_message: str | None = None
