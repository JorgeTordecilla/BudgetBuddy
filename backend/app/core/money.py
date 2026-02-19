from typing import Literal

from app.errors import (
    money_amount_not_integer_error,
    money_amount_out_of_range_error,
    money_amount_sign_invalid_error,
    money_currency_mismatch_error,
)

# Conservative product-level bound to avoid absurd values while staying far from DB limits.
MAX_ABSOLUTE_AMOUNT_CENTS = 9_999_999_999_99
SUPPORTED_CURRENCIES = {"USD", "COP", "EUR", "MXN"}
TransactionType = Literal["income", "expense"]


def validate_user_currency_for_money(currency_code: str) -> None:
    if currency_code not in SUPPORTED_CURRENCIES:
        raise money_currency_mismatch_error("User currency is not supported for money operations")


def validate_amount_cents(amount_cents: object, tx_type: TransactionType) -> int:
    if not isinstance(amount_cents, int) or isinstance(amount_cents, bool):
        raise money_amount_not_integer_error("amount_cents must be an integer")

    # Current domain sign rule: both income and expense are represented as positive cents.
    if amount_cents <= 0:
        raise money_amount_sign_invalid_error(
            f"amount_cents must be positive for transaction type '{tx_type}'"
        )

    if amount_cents > MAX_ABSOLUTE_AMOUNT_CENTS:
        raise money_amount_out_of_range_error("amount_cents exceeds safe bounds")

    return amount_cents
