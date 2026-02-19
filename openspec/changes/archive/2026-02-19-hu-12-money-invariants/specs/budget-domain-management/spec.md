## MODIFIED Requirements

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, archive, and restore semantics including all documented filters, while enforcing strict money invariants for `amount_cents` and currency consistency.

#### Scenario: List transactions with filters
- **WHEN** `GET /transactions` is called with optional filters (`type`, `account_id`, `category_id`, `from`, `to`, `include_archived`, `cursor`, `limit`)
- **THEN** the API SHALL return `200` ordered most recent first with `{ items, next_cursor }`

#### Scenario: Invalid transactions cursor is rejected
- **WHEN** `GET /transactions` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails

#### Scenario: Transaction business-rule conflict
- **WHEN** a transaction write violates domain constraints (for example archived account, archived category, or type mismatch)
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Create transaction with archived category is rejected
- **WHEN** `POST /transactions` uses `category_id` for a category with `archived_at != null`
- **THEN** the API SHALL reject with canonical category archived `409` ProblemDetails

#### Scenario: Patch transaction with archived effective category is rejected
- **WHEN** `PATCH /transactions/{transaction_id}` resolves to an archived category (by changing `category_id` or keeping existing archived category)
- **THEN** the API SHALL reject with canonical category archived `409` ProblemDetails

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

#### Scenario: Non-owned transaction access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/transactions/{transaction_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Archived transaction is restored via patch
- **WHEN** owner calls `PATCH /transactions/{transaction_id}` with `archived_at=null` for an archived transaction
- **THEN** transaction SHALL be restored and API SHALL return `200` with `Transaction`

#### Scenario: Transaction restore is idempotent
- **WHEN** owner calls `PATCH /transactions/{transaction_id}` with `archived_at=null` for an already-active transaction
- **THEN** API SHALL return `200` and keep active state without conflict

#### Scenario: Restore blocked for non-owner
- **WHEN** authenticated non-owner calls restore patch for another user's transaction
- **THEN** API SHALL return canonical `403` ProblemDetails

#### Scenario: amount_cents must be an integer on create
- **WHEN** `POST /transactions` provides a non-integer `amount_cents` value
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: amount_cents must be an integer on patch
- **WHEN** `PATCH /transactions/{transaction_id}` provides a non-integer `amount_cents` value
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: amount_cents is rejected when zero or sign-invalid
- **WHEN** a transaction write provides `amount_cents=0` or a sign that violates the domain sign rule for the effective transaction type
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: amount_cents is rejected when out of safe bounds
- **WHEN** a transaction write provides `amount_cents` beyond configured safe limits
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: transaction currency must match user currency
- **WHEN** a transaction write resolves to a money operation with a currency different from the authenticated user's `currency_code`
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails
