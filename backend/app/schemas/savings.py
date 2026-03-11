from datetime import date as DateType, datetime

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.models.enums import SavingsGoalStatus


class SavingsGoalBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_cents: StrictInt
    account_id: str
    category_id: str
    deadline: DateType | None = None
    note: str | None = None


class SavingsGoalCreate(SavingsGoalBase):
    pass


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_cents: StrictInt | None = None
    account_id: str | None = None
    category_id: str | None = None
    deadline: DateType | None = None
    note: str | None = None


class SavingsContributionCreate(BaseModel):
    amount_cents: StrictInt
    note: str | None = None


class SavingsContributionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_id: str
    amount_cents: int
    transaction_id: str
    note: str | None
    contributed_at: datetime


class SavingsGoalComputed(BaseModel):
    saved_cents: int
    remaining_cents: int
    progress_pct: float


class SavingsGoalOut(SavingsGoalBase, SavingsGoalComputed):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: SavingsGoalStatus
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SavingsGoalListOut(BaseModel):
    items: list[SavingsGoalOut]


class SavingsGoalDetailOut(SavingsGoalOut):
    contributions: list[SavingsContributionOut]


class SavingsSummaryOut(BaseModel):
    active_count: int
    completed_count: int
    total_target_cents: int
    total_saved_cents: int
    total_remaining_cents: int
    overall_progress_pct: float
