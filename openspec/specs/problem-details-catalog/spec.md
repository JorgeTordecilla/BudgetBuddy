## Purpose

Define a single canonical catalog of supported ProblemDetails values so API documentation and runtime remain aligned.

## ADDED Requirements

### Requirement: Canonical ProblemDetails Catalog
The API contract MUST provide a single canonical catalog of supported ProblemDetails entries with exact `type`, `title`, and `status`, including money-validation failures and budget-domain conflicts.

#### Scenario: Catalog includes canonical auth and negotiation errors
- **WHEN** OpenAPI contract files are reviewed
- **THEN** the catalog SHALL include canonical entries for unauthorized (`401`), forbidden (`403`), and not acceptable (`406`)

#### Scenario: Catalog includes canonical cursor and business conflicts
- **WHEN** OpenAPI contract files are reviewed
- **THEN** the catalog SHALL include canonical entries for invalid cursor (`400`), invalid date range (`400`), and documented business conflicts (`409`) used by runtime

#### Scenario: Canonical fields are exact for invalid date range
- **WHEN** runtime emits invalid date range errors for list endpoints
- **THEN** the payload SHALL use exact `type=https://api.budgetbuddy.dev/problems/invalid-date-range`, `title=Invalid date range`, `status=400`

#### Scenario: Catalog includes canonical money validation errors
- **WHEN** money validation rules reject invalid `amount_cents` values or currency mismatches
- **THEN** the catalog SHALL define canonical `400` entries with stable `type`, `title`, and `status` values

#### Scenario: Catalog includes canonical budget conflict errors
- **WHEN** budget write rules reject duplicate monthly budgets, archived categories, or non-owned categories
- **THEN** the catalog SHALL define canonical `409` entries with stable `type`, `title`, and `status` values for those budget conflicts

### Requirement: Catalog and Runtime Alignment
Documented ProblemDetails catalog entries MUST match runtime emissions exactly.

#### Scenario: Runtime helpers map to catalog values
- **WHEN** canonical error helpers and middleware/dependencies emit ProblemDetails
- **THEN** `type`, `title`, and `status` SHALL match the catalog with no drift

#### Scenario: Money validation helpers map to catalog values
- **WHEN** amount/currency validations fail in transaction write paths
- **THEN** emitted `ProblemDetails` SHALL match canonical money-validation catalog entries exactly

#### Scenario: Budget conflict helpers map to catalog values
- **WHEN** budget domain rules emit conflict errors
- **THEN** emitted `ProblemDetails` SHALL match canonical budget conflict catalog entries exactly

### Requirement: API error details are sanitized
ProblemDetails emitted by the API MUST avoid sensitive/internal data exposure in `detail`.

#### Scenario: Stack trace is not exposed
- **WHEN** an error path builds `ProblemDetails`
- **THEN** `detail` SHALL NOT include stack traces or exception dumps

#### Scenario: Token-like values are not exposed
- **WHEN** an error path includes request context
- **THEN** `detail` SHALL NOT include bearer tokens, JWT payloads, or secret-like values

#### Scenario: Validation internals are not exposed
- **WHEN** money-validation failures are converted to `ProblemDetails`
- **THEN** `detail` SHALL NOT leak internal validator class names, SQL errors, or stack frame information

### Requirement: API error logging has minimum structured operational fields
API error logging MUST include structured fields for traceability.

#### Scenario: APIError is logged with request context
- **WHEN** an `APIError` is handled
- **THEN** logs SHALL include `request_id`, `path`, `status`, and `problem_type`

#### Scenario: Logging avoids sensitive credentials
- **WHEN** API error context is logged
- **THEN** logs SHALL NOT include authorization header values or secret-like data

### Requirement: Canonical rate-limited ProblemDetails entry
The ProblemDetails catalog MUST include a canonical rate-limiting entry used by auth throttling responses.

#### Scenario: Catalog defines canonical 429 identity
- **WHEN** OpenAPI catalog entries are reviewed
- **THEN** the catalog SHALL define a canonical `429` entry with exact `type`, `title`, and `status` for rate-limited responses

#### Scenario: Runtime throttling uses canonical 429 values
- **WHEN** login or refresh requests are throttled by rate-limiter policy
- **THEN** response payloads SHALL use the exact canonical `type`, `title`, and `status` values defined in the catalog

### Requirement: Throttling error details are sanitized
Rate-limit error payloads MUST avoid leaking internal limiter implementation details.

#### Scenario: Rate-limit detail avoids internals
- **WHEN** a `429` ProblemDetails payload is returned
- **THEN** `detail` SHALL NOT expose cache keys, backend topology, or internal stack information

#### Scenario: Retry guidance remains client-safe
- **WHEN** throttled responses include retry guidance
- **THEN** guidance fields SHALL remain client-safe and SHALL NOT reveal sensitive server internals

