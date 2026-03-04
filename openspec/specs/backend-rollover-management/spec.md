## Purpose

Define backend rollover preview/apply behavior, persistence guarantees, and canonical error semantics.

## Requirements

### Requirement: Rollover preview endpoint is deterministic and side-effect free
The backend MUST provide `GET /rollover/preview?month=YYYY-MM` as a read-only endpoint returning source-month surplus and application state.

#### Scenario: Preview returns positive surplus with unapplied state
- **WHEN** source month has `income_total_cents > expense_total_cents` and no `monthly_rollover` exists for that source month
- **THEN** API SHALL return `200` with `surplus_cents = income - expense`, `already_applied = false`, and `applied_transaction_id = null`.

#### Scenario: Preview clamps deficit to zero
- **WHEN** source month has `income_total_cents <= expense_total_cents`
- **THEN** API SHALL return `200` with `surplus_cents = 0` and `already_applied = false` unless an applied record exists.

#### Scenario: Preview returns applied state when rollover already exists
- **WHEN** `monthly_rollover` exists for the user and source month
- **THEN** API SHALL return `200` with `already_applied = true` and `applied_transaction_id` referencing the stored transaction.

### Requirement: Rollover apply endpoint materializes exactly one next-month income transaction
The backend MUST provide `POST /rollover/apply` that creates one income transaction on next-month day 1 using computed source-month surplus.

#### Scenario: Apply succeeds for positive surplus
- **WHEN** request provides valid `source_month`, user-owned `account_id`, and user-owned `income` `category_id`, and computed surplus is positive
- **THEN** API SHALL return `201` and create a transaction with `type=income`, `date=<source_month+1>-01`, `amount_cents=surplus`, and linked rollover income source.

#### Scenario: Apply rejects non-positive surplus
- **WHEN** computed source-month surplus is `0`
- **THEN** API SHALL return `422` as ProblemDetails with canonical type `rollover-no-surplus`.

#### Scenario: Apply is idempotent per source month
- **WHEN** apply is requested for a source month that was already applied by the same user
- **THEN** API SHALL return `409` as ProblemDetails with canonical type `rollover-already-applied` and SHALL NOT create a second transaction.

#### Scenario: Apply requires authentication
- **WHEN** apply is requested without valid authentication
- **THEN** API SHALL return `401` as ProblemDetails.

### Requirement: Applied rollover persistence guarantees uniqueness and traceability
The backend MUST persist applied rollover operations in `monthly_rollover` with user-scoped uniqueness by source month.

#### Scenario: Unique key prevents duplicate apply under concurrency
- **WHEN** two apply operations race for the same `user_id` and `source_month`
- **THEN** persistence SHALL allow at most one committed row in `monthly_rollover` and API conflict mapping SHALL remain deterministic.

#### Scenario: Applied row stores transaction linkage
- **WHEN** apply succeeds
- **THEN** `monthly_rollover` SHALL store `user_id`, `source_month`, `transaction_id`, `amount_cents`, and creation timestamp for auditability.
