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

class AuthSessionResponse(BaseModel):
    user: UserOut
    access_token: str
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
    income_source_id: str | None = None
    amount_cents: StrictInt
    date: DateType
    merchant: str | None = None
    note: str | None = None
    mood: str | None = None
    is_impulse: bool | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: Literal["income", "expense"] | None = None
    account_id: str | None = None
    category_id: str | None = None
    income_source_id: str | None = None
    amount_cents: StrictInt | None = None
    date: DateType | None = None
    merchant: str | None = None
    note: str | None = None
    mood: str | None = None
    is_impulse: bool | None = None
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
    expected_income_cents: int
    actual_income_cents: int
    rollover_in_cents: int = 0
    budget_spent_cents: int | None = None
    budget_limit_cents: int | None = None


class AnalyticsByMonthResponse(BaseModel):
    items: list[AnalyticsByMonthItem]


class AnalyticsByCategoryItem(BaseModel):
    category_id: str
    category_name: str
    category_type: Literal["income", "expense"]
    income_total_cents: int
    expense_total_cents: int
    budget_spent_cents: int | None = None
    budget_limit_cents: int | None = None


class AnalyticsByCategoryResponse(BaseModel):
    items: list[AnalyticsByCategoryItem]


class ImpulseCategoryOut(BaseModel):
    category_id: str
    category_name: str
    count: int


class ImpulseSummaryOut(BaseModel):
    impulse_count: int
    intentional_count: int
    untagged_count: int
    top_impulse_categories: list[ImpulseCategoryOut]


class IncomeSourceBase(BaseModel):
    name: str = Field(min_length=1)
    expected_amount_cents: StrictInt
    frequency: Literal["monthly"] = "monthly"
    is_active: bool = True
    note: str | None = None


class IncomeSourceCreate(IncomeSourceBase):
    pass


class IncomeSourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    expected_amount_cents: StrictInt | None = None
    frequency: Literal["monthly"] | None = None
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


class RolloverPreviewOut(BaseModel):
    month: str
    surplus_cents: int
    already_applied: bool
    applied_transaction_id: str | None


class RolloverApplyRequest(BaseModel):
    source_month: str = Field(pattern=r"^\d{4}-\d{2}$")
    account_id: str
    category_id: str


class RolloverApplyOut(BaseModel):
    source_month: str
    target_month: str
    transaction_id: str
    amount_cents: int


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
    status: Literal["active", "completed", "cancelled"]
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


class BudgetListResponse(BaseModel):
    items: list[BudgetOut]


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    request_id: str
    user_id: str
    resource_type: str
    resource_id: str | None
    action: str
    created_at: datetime


class AuditListResponse(BaseModel):
    items: list[AuditEventOut]
    next_cursor: str | None
