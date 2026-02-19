from datetime import date as DateType, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    currency_code: Literal["USD", "COP", "EUR", "MXN"]


class RegisterRequest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{3,20}$")
    password: str = Field(min_length=12)
    currency_code: Literal["USD", "COP", "EUR", "MXN"]


class LoginRequest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{3,20}$")
    password: str = Field(min_length=12)


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    access_token_expires_in: int


class AccountBase(BaseModel):
    name: str = Field(min_length=1)
    type: Literal["cash", "debit", "credit", "bank"]
    initial_balance_cents: int
    note: str | None = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    type: Literal["cash", "debit", "credit", "bank"] | None = None
    initial_balance_cents: int | None = None
    note: str | None = None
    archived_at: datetime | None = None


class AccountOut(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None


class CategoryBase(BaseModel):
    name: str = Field(min_length=1)
    type: Literal["income", "expense"]
    note: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    note: str | None = None
    archived_at: datetime | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None


class TransactionBase(BaseModel):
    type: Literal["income", "expense"]
    account_id: str
    category_id: str
    amount_cents: StrictInt
    date: DateType
    merchant: str | None = None
    note: str | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: Literal["income", "expense"] | None = None
    account_id: str | None = None
    category_id: str | None = None
    amount_cents: StrictInt | None = None
    date: DateType | None = None
    merchant: str | None = None
    note: str | None = None
    archived_at: datetime | None = None


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AnalyticsByMonthItem(BaseModel):
    month: str
    income_total_cents: int
    expense_total_cents: int
    budget_spent_cents: int | None = None
    budget_limit_cents: int | None = None


class AnalyticsByMonthResponse(BaseModel):
    items: list[AnalyticsByMonthItem]


class AnalyticsByCategoryItem(BaseModel):
    category_id: str
    category_name: str
    income_total_cents: int
    expense_total_cents: int
    budget_spent_cents: int | None = None
    budget_limit_cents: int | None = None


class AnalyticsByCategoryResponse(BaseModel):
    items: list[AnalyticsByCategoryItem]


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
