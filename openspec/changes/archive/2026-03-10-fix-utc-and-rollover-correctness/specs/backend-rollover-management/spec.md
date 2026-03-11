## MODIFIED Requirements

### Requirement: Rollover apply endpoint materializes exactly one next-month income transaction
The backend MUST provide `POST /rollover/apply` that creates one income transaction on next-month day 1 using computed source-month surplus, while distinguishing ownership failures from archived-resource conflicts.

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

#### Scenario: Apply rejects invalid source month value
- **WHEN** apply receives an invalid `source_month` value
- **THEN** API SHALL return canonical `400` ProblemDetails with invalid-date-range semantics

#### Scenario: Apply rejects foreign account with forbidden response
- **WHEN** the authenticated user supplies an account that does not belong to them
- **THEN** the API SHALL return canonical `403 Forbidden`.

#### Scenario: Apply rejects foreign income category with forbidden response
- **WHEN** the authenticated user supplies an income category that does not belong to them
- **THEN** the API SHALL return canonical `403 Forbidden`.

#### Scenario: Apply rejects archived owned account with conflict response
- **WHEN** the authenticated user supplies an owned account that is archived
- **THEN** the API SHALL return canonical `409 Conflict`.

#### Scenario: Apply rejects archived owned income category with conflict response
- **WHEN** the authenticated user supplies an owned income category that is archived
- **THEN** the API SHALL return canonical `409 Conflict`.

## ADDED Requirements

### Requirement: Rollover source normalization is explicit for maintainers
Rollover source normalization helpers MUST make ORM mutation semantics explicit to callers.

#### Scenario: Source normalization documents caller commit responsibility
- **WHEN** maintainers read the rollover source normalization helper
- **THEN** the helper SHALL document that it mutates a session-bound object
- **AND** it SHALL document that the caller is responsible for committing those mutations.
