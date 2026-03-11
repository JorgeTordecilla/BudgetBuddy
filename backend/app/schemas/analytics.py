from pydantic import BaseModel

from app.models.enums import CategoryType


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
    category_type: CategoryType
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
