## MODIFIED Requirements

### Requirement: Canonical ProblemDetails Catalog
The API contract MUST provide a single canonical catalog of supported ProblemDetails entries with exact `type`, `title`, and `status`, including money-validation failures.

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

### Requirement: Catalog and Runtime Alignment
Documented ProblemDetails catalog entries MUST match runtime emissions exactly.

#### Scenario: Runtime helpers map to catalog values
- **WHEN** canonical error helpers and middleware/dependencies emit ProblemDetails
- **THEN** `type`, `title`, and `status` SHALL match the catalog with no drift

#### Scenario: Money validation helpers map to catalog values
- **WHEN** amount/currency validations fail in transaction write paths
- **THEN** emitted `ProblemDetails` SHALL match canonical money-validation catalog entries exactly

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
