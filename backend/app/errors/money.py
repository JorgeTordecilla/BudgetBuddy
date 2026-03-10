from app.errors._helpers import make_api_error

MONEY_AMOUNT_NOT_INTEGER_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-not-integer"
MONEY_AMOUNT_NOT_INTEGER_TITLE = "Money amount must be an integer"
MONEY_AMOUNT_NOT_INTEGER_STATUS = 400

MONEY_AMOUNT_OUT_OF_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-out-of-range"
MONEY_AMOUNT_OUT_OF_RANGE_TITLE = "Money amount is out of safe range"
MONEY_AMOUNT_OUT_OF_RANGE_STATUS = 400

MONEY_AMOUNT_SIGN_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-sign-invalid"
MONEY_AMOUNT_SIGN_INVALID_TITLE = "Money amount sign is invalid"
MONEY_AMOUNT_SIGN_INVALID_STATUS = 400

MONEY_CURRENCY_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/money-currency-mismatch"
MONEY_CURRENCY_MISMATCH_TITLE = "Money currency mismatch"
MONEY_CURRENCY_MISMATCH_STATUS = 400


def money_amount_not_integer_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=MONEY_AMOUNT_NOT_INTEGER_STATUS,
        title=MONEY_AMOUNT_NOT_INTEGER_TITLE,
        detail=detail,
        type_=MONEY_AMOUNT_NOT_INTEGER_TYPE,
    )


def money_amount_out_of_range_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=MONEY_AMOUNT_OUT_OF_RANGE_STATUS,
        title=MONEY_AMOUNT_OUT_OF_RANGE_TITLE,
        detail=detail,
        type_=MONEY_AMOUNT_OUT_OF_RANGE_TYPE,
    )


def money_amount_sign_invalid_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=MONEY_AMOUNT_SIGN_INVALID_STATUS,
        title=MONEY_AMOUNT_SIGN_INVALID_TITLE,
        detail=detail,
        type_=MONEY_AMOUNT_SIGN_INVALID_TYPE,
    )


def money_currency_mismatch_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=MONEY_CURRENCY_MISMATCH_STATUS,
        title=MONEY_CURRENCY_MISMATCH_TITLE,
        detail=detail,
        type_=MONEY_CURRENCY_MISMATCH_TYPE,
    )
