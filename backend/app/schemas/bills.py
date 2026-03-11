from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class BillBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    due_day: int
    budget_cents: StrictInt
    category_id: str
    account_id: str
    note: str | None = None
    is_active: bool = True


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    due_day: int | None = None
    budget_cents: StrictInt | None = None
    category_id: str | None = None
    account_id: str | None = None
    note: str | None = None
    is_active: bool | None = None


class BillOut(BillBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class BillListOut(BaseModel):
    items: list[BillOut]


class BillPaymentCreate(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    actual_cents: StrictInt | None = None


class BillPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bill_id: str
    month: str
    actual_cents: int
    transaction_id: str
    paid_at: datetime


class BillMonthlyStatusSummary(BaseModel):
    total_budget_cents: int
    total_paid_cents: int
    total_pending_cents: int
    paid_count: int
    pending_count: int


class BillMonthlyStatusItem(BaseModel):
    bill_id: str
    name: str
    due_day: int
    due_date: str
    budget_cents: int
    status: Literal["paid", "pending", "overdue"]
    actual_cents: int | None
    transaction_id: str | None
    diff_cents: int | None


class BillMonthlyStatusOut(BaseModel):
    month: str
    summary: BillMonthlyStatusSummary
    items: list[BillMonthlyStatusItem]
