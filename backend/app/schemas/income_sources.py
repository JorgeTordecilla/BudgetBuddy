from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.models.enums import IncomeFrequency


class IncomeSourceBase(BaseModel):
    name: str = Field(min_length=1)
    expected_amount_cents: StrictInt
    frequency: IncomeFrequency = IncomeFrequency.MONTHLY
    is_active: bool = True
    note: str | None = None


class IncomeSourceCreate(IncomeSourceBase):
    pass


class IncomeSourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    expected_amount_cents: StrictInt | None = None
    frequency: IncomeFrequency | None = None
    is_active: bool | None = None
    note: str | None = None
    archived_at: datetime | None = None


class IncomeSourceOut(IncomeSourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class IncomeSourceListOut(BaseModel):
    items: list[IncomeSourceOut]


class IncomeSourceAnalyticsRow(BaseModel):
    income_source_id: str | None
    income_source_name: str
    expected_income_cents: int
    actual_income_cents: int


class IncomeAnalyticsItem(BaseModel):
    month: str
    expected_income_cents: int
    actual_income_cents: int
    rows: list[IncomeSourceAnalyticsRow]


class IncomeAnalyticsOut(BaseModel):
    items: list[IncomeAnalyticsItem]
