## ADDED Requirements

### Requirement: Transaction listing uses a stable domain ordering
Transaction listing behavior MUST be stable and deterministic for equivalent filter inputs.

#### Scenario: Domain sort is most recent first with deterministic ties
- **WHEN** list queries resolve multiple transactions
- **THEN** domain ordering SHALL be `date desc` with tie-breaker `created_at desc`

### Requirement: Transaction list filters are evaluated in one effective predicate
Transaction listing MUST evaluate optional filters consistently for domain correctness.

#### Scenario: Combined filters narrow result set deterministically
- **WHEN** `type`, `account_id`, `category_id`, `from`, and `to` are provided
- **THEN** the list result SHALL only contain transactions satisfying all provided constraints

#### Scenario: Include archived toggles archived visibility
- **WHEN** `include_archived=false` or omitted
- **THEN** archived transactions SHALL be excluded from list results

### Requirement: Invalid date range is rejected before data fetch
Transaction listing MUST fail fast for invalid date-range predicates.

#### Scenario: Invalid range is rejected
- **WHEN** `from` is later than `to`
- **THEN** the request SHALL fail with canonical invalid-date-range `400` ProblemDetails
