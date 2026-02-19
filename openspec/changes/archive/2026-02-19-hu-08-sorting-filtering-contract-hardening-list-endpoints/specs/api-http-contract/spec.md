## ADDED Requirements

### Requirement: Transaction list ordering is deterministic
The API SHALL return `GET /transactions` results with deterministic ordering for the same query inputs.

#### Scenario: Primary ordering by transaction date descending
- **WHEN** a client requests `GET /transactions`
- **THEN** items SHALL be ordered by `date` in descending order (most recent first)

#### Scenario: Stable tie-breaker ordering by created_at descending
- **WHEN** two or more transactions have the same `date`
- **THEN** the API SHALL apply a stable tie-breaker using `created_at` descending

### Requirement: Transaction list filters are combinable and explicit
The API SHALL support combined filtering on transactions using `type`, `account_id`, `category_id`, `from`, `to`, and `include_archived`.

#### Scenario: Combined filters are applied conjunctively
- **WHEN** a client sends multiple supported list filters in a single `GET /transactions` request
- **THEN** the API SHALL apply all provided filters as an AND condition before pagination

#### Scenario: List contract documents supported filter set
- **WHEN** OpenAPI contract is reviewed for `GET /transactions`
- **THEN** it SHALL explicitly document filter parameters and deterministic ordering behavior

### Requirement: Invalid transaction date range returns canonical ProblemDetails
The API SHALL reject invalid date range queries on `GET /transactions` with canonical `400` ProblemDetails.

#### Scenario: From date greater than to date
- **WHEN** `GET /transactions` is called with `from > to`
- **THEN** the API SHALL return `400` with `Content-Type: application/problem+json` and exact `type=https://api.budgetbuddy.dev/problems/invalid-date-range`, `title=Invalid date range`, `status=400`
