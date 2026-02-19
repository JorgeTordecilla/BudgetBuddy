## MODIFIED Requirements

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
