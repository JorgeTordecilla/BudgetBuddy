## Purpose

Define a single canonical catalog of supported ProblemDetails values so API documentation and runtime remain aligned.

## ADDED Requirements

### Requirement: Canonical ProblemDetails Catalog
The API contract MUST provide a single canonical catalog of supported ProblemDetails entries with exact `type`, `title`, and `status`.

#### Scenario: Catalog includes canonical auth and negotiation errors
- **WHEN** OpenAPI contract files are reviewed
- **THEN** the catalog SHALL include canonical entries for unauthorized (`401`), forbidden (`403`), and not acceptable (`406`)

#### Scenario: Catalog includes canonical cursor and business conflicts
- **WHEN** OpenAPI contract files are reviewed
- **THEN** the catalog SHALL include canonical entries for invalid cursor (`400`), invalid date range (`400`), and documented business conflicts (`409`) used by runtime

#### Scenario: Canonical fields are exact for invalid date range
- **WHEN** runtime emits invalid date range errors for list endpoints
- **THEN** the payload SHALL use exact `type=https://api.budgetbuddy.dev/problems/invalid-date-range`, `title=Invalid date range`, `status=400`

### Requirement: Catalog and Runtime Alignment
Documented ProblemDetails catalog entries MUST match runtime emissions exactly.

#### Scenario: Runtime helpers map to catalog values
- **WHEN** canonical error helpers and middleware/dependencies emit ProblemDetails
- **THEN** `type`, `title`, and `status` SHALL match the catalog with no drift
