from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import APIError
from app.core.money import validate_amount_cents, validate_user_currency_for_money
from app.errors import (
    account_archived_error,
    category_archived_error,
    category_type_mismatch_error,
    forbidden_error,
    import_batch_limit_exceeded_error,
    transaction_mood_invalid_error,
)
from app.models import Account, Category, Transaction, User
from app.models.enums import TransactionMood, TransactionType
from app.repositories import (
    SQLAlchemyAccountRepository,
    SQLAlchemyCategoryRepository,
    SQLAlchemyIncomeSourceRepository,
    SQLAlchemyTransactionRepository,
)

_VALID_TRANSACTION_MOODS = {mood.value for mood in TransactionMood}


def _business_rule_conflict() -> APIError:
    return APIError(status=409, title="Conflict", detail="Business rule conflict")


def owned_transaction_or_403(db: Session, user_id: str, transaction_id: str) -> Transaction:
    row = SQLAlchemyTransactionRepository(db).get_owned(user_id, transaction_id)
    if not row:
        raise forbidden_error("Not allowed")
    return row


def owned_account_or_conflict(db: Session, user_id: str, account_id: str) -> Account:
    account = SQLAlchemyAccountRepository(db).get_owned(user_id, account_id)
    if not account:
        raise _business_rule_conflict()
    if account.archived_at is not None:
        raise account_archived_error()
    return account


def owned_category_or_conflict(db: Session, user_id: str, category_id: str) -> Category:
    category = SQLAlchemyCategoryRepository(db).get_owned(user_id, category_id)
    if not category:
        raise _business_rule_conflict()
    if category.archived_at is not None:
        raise category_archived_error()
    return category


def owned_active_income_source_or_conflict(db: Session, user_id: str, income_source_id: str):
    income_source = SQLAlchemyIncomeSourceRepository(db).get_owned(user_id, income_source_id)
    if not income_source:
        raise _business_rule_conflict()
    if income_source.archived_at is not None:
        raise _business_rule_conflict()
    return income_source


def validate_income_source_rule(db: Session, user_id: str, payload: dict) -> None:
    income_source_id = payload.get("income_source_id")
    if payload["type"] == "expense":
        if income_source_id is not None:
            raise APIError(
                status=400,
                title="Invalid request",
                detail="income_source_id is only allowed for income transactions",
            )
        return
    if income_source_id is None:
        return
    owned_active_income_source_or_conflict(db, user_id, income_source_id)


def validate_business_rules(db: Session, user_id: str, payload: dict):
    account = owned_account_or_conflict(db, user_id, payload["account_id"])
    category = owned_category_or_conflict(db, user_id, payload["category_id"])
    if payload["type"] != category.type:
        raise category_type_mismatch_error()
    validate_income_source_rule(db, user_id, payload)
    return account, category


def validate_transaction_mood(payload: dict) -> None:
    mood = payload.get("mood")
    if mood is None:
        return
    if mood not in _VALID_TRANSACTION_MOODS:
        raise transaction_mood_invalid_error("mood must be one of: happy, neutral, sad, anxious, bored")


def validate_money_rules(user: User, tx_type: TransactionType, amount_cents: object) -> int:
    validate_user_currency_for_money(user.currency_code)
    return validate_amount_cents(amount_cents, tx_type)


def validate_batch_size_or_400(item_count: int) -> None:
    if item_count > settings.transaction_import_max_items:
        raise import_batch_limit_exceeded_error(
            f"items exceeds maximum batch size ({settings.transaction_import_max_items})"
        )

