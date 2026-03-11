from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountType


class AccountBase(BaseModel):
    name: str = Field(min_length=1)
    type: AccountType
    initial_balance_cents: int
    note: str | None = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    type: AccountType | None = None
    initial_balance_cents: int | None = None
    note: str | None = None
    archived_at: datetime | None = None


class AccountOut(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
