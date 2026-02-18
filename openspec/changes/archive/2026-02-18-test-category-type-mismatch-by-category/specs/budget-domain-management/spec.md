## MODIFIED Requirements

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, and archive semantics including all documented filters.

#### Scenario: List transactions with filters
- **WHEN** `GET /transactions` is called with optional filters (`type`, `account_id`, `category_id`, `from`, `to`, `include_archived`, `cursor`, `limit`)
- **THEN** the API SHALL return `200` ordered most recent first with `{ items, next_cursor }`

#### Scenario: Transaction business-rule conflict
- **WHEN** a transaction write violates domain constraints (for example archived account or type mismatch)
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Creating transaction on archived account is rejected
- **WHEN** a client calls `POST /transactions` with an `account_id` that belongs to the user and has `archived_at != null`
- **THEN** the API SHALL reject with `409` `ProblemDetails` and canonical `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, `status=409`

#### Scenario: Category type mismatch on transaction write is rejected
- **WHEN** a client calls `POST /transactions` or `PATCH /transactions/{transaction_id}` with `type` not matching selected `category.type`
- **THEN** the API SHALL reject with `409` `ProblemDetails` and canonical `type=https://api.budgetbuddy.dev/problems/category-type-mismatch`, `title=Category type mismatch`, `status=409`

#### Scenario: Income transaction with expense category is rejected
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` uses `type=income` and `category.type=expense`
- **THEN** the API SHALL reject with `409` mismatch ProblemDetails

#### Scenario: Expense transaction with income category is rejected
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` uses `type=expense` and `category.type=income`
- **THEN** the API SHALL reject with `409` mismatch ProblemDetails
