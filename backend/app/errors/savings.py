from app.errors._helpers import make_api_error

SAVINGS_GOAL_INVALID_TARGET_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-invalid-target"
SAVINGS_GOAL_INVALID_TARGET_TITLE = "Savings goal target must be greater than zero"
SAVINGS_GOAL_INVALID_TARGET_STATUS = 422

SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-category-type-mismatch"
SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TITLE = "Savings goal category must be of type expense"
SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_STATUS = 409

SAVINGS_GOAL_DEADLINE_PAST_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-deadline-past"
SAVINGS_GOAL_DEADLINE_PAST_TITLE = "Savings goal deadline cannot be in the past"
SAVINGS_GOAL_DEADLINE_PAST_STATUS = 422

SAVINGS_GOAL_NOT_ACTIVE_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-not-active"
SAVINGS_GOAL_NOT_ACTIVE_TITLE = "Savings goal is not active and cannot receive contributions"
SAVINGS_GOAL_NOT_ACTIVE_STATUS = 409

SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TYPE = "https://api.budgetbuddy.dev/problems/savings-contribution-invalid-amount"
SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TITLE = "Contribution amount must be greater than zero"
SAVINGS_CONTRIBUTION_INVALID_AMOUNT_STATUS = 422

SAVINGS_GOAL_ALREADY_COMPLETED_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-already-completed"
SAVINGS_GOAL_ALREADY_COMPLETED_TITLE = "Savings goal is already completed"
SAVINGS_GOAL_ALREADY_COMPLETED_STATUS = 409


def savings_goal_invalid_target_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SAVINGS_GOAL_INVALID_TARGET_STATUS,
        title=SAVINGS_GOAL_INVALID_TARGET_TITLE,
        detail=detail,
        type_=SAVINGS_GOAL_INVALID_TARGET_TYPE,
    )


def savings_goal_category_type_mismatch_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_STATUS,
        title=SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TITLE,
        detail=detail,
        type_=SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TYPE,
    )


def savings_goal_deadline_past_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SAVINGS_GOAL_DEADLINE_PAST_STATUS,
        title=SAVINGS_GOAL_DEADLINE_PAST_TITLE,
        detail=detail,
        type_=SAVINGS_GOAL_DEADLINE_PAST_TYPE,
    )


def savings_goal_not_active_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SAVINGS_GOAL_NOT_ACTIVE_STATUS,
        title=SAVINGS_GOAL_NOT_ACTIVE_TITLE,
        detail=detail,
        type_=SAVINGS_GOAL_NOT_ACTIVE_TYPE,
    )


def savings_contribution_invalid_amount_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SAVINGS_CONTRIBUTION_INVALID_AMOUNT_STATUS,
        title=SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TITLE,
        detail=detail,
        type_=SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TYPE,
    )


def savings_goal_already_completed_error(detail: str | None = None) -> "APIError":
    return make_api_error(
        status=SAVINGS_GOAL_ALREADY_COMPLETED_STATUS,
        title=SAVINGS_GOAL_ALREADY_COMPLETED_TITLE,
        detail=detail,
        type_=SAVINGS_GOAL_ALREADY_COMPLETED_TYPE,
    )
