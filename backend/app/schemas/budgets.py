from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class BudgetBase(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    category_id: str
    limit_cents: StrictInt


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    category_id: str | None = None
    limit_cents: StrictInt | None = None
    archived_at: datetime | None = None


class BudgetOut(BudgetBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class BudgetListResponse(BaseModel):
    items: list[BudgetOut]
