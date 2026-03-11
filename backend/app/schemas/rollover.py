from pydantic import BaseModel


class RolloverPreviewOut(BaseModel):
    month: str
    surplus_cents: int
    already_applied: bool
    applied_transaction_id: str | None


class RolloverApplyRequest(BaseModel):
    source_month: str
    account_id: str
    category_id: str


class RolloverApplyOut(BaseModel):
    source_month: str
    target_month: str
    transaction_id: str
    amount_cents: int
