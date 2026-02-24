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

### Requirement: Audit query failures use canonical ProblemDetails
Audit query validation and access-control failures MUST map to canonical ProblemDetails catalog entries.

#### Scenario: Invalid cursor and invalid date range remain canonical for audit
- **WHEN** `GET /audit` fails due to malformed cursor or `from > to`
- **THEN** responses SHALL use canonical `400` `type/title/status` values already defined in the catalog

#### Scenario: Unauthorized and forbidden audit access remain canonical
- **WHEN** `GET /audit` is called without valid auth or with disallowed ownership scope
- **THEN** responses SHALL use canonical `401` or `403` ProblemDetails values

### Requirement: Audit-related ProblemDetails remain sanitized
ProblemDetails generated by audit endpoint handling MUST not expose internal implementation details.

#### Scenario: Audit error detail omits internals
- **WHEN** audit endpoint returns `application/problem+json`
- **THEN** `detail` SHALL NOT expose SQL internals, stack traces, or storage topology

#### Scenario: Audit error detail omits secret-like values
- **WHEN** audit errors reference auth context
- **THEN** `detail` SHALL NOT contain token-like or credential-like values

### Requirement: Canonical ProblemDetails examples are reusable
The ProblemDetails catalog MUST provide reusable canonical examples for `400`, `401`, `403`, `406`, `409`, and `429`, and those examples MUST be referenceable from endpoint responses without semantic drift.

#### Scenario: Canonical example coverage includes required statuses
- **WHEN** the OpenAPI catalog is reviewed
- **THEN** canonical examples SHALL exist for `400`, `401`, `403`, `406`, `409`, and `429`

#### Scenario: Canonical examples use stable identity fields
- **WHEN** canonical error examples are defined
- **THEN** each example SHALL include stable `type`, `title`, and `status` values aligned with runtime helpers

#### Scenario: Endpoint responses reference canonical examples consistently
- **WHEN** endpoint `application/problem+json` responses are reviewed
- **THEN** mapped examples SHALL reference or mirror catalog canonical identities with no mismatch between response meaning and example identity

### Requirement: Canonical 400 variants are distinguished by use-case
The catalog and response mappings MUST keep `invalid-cursor` and `invalid-date-range` as distinct canonical 400 identities with non-overlapping endpoint usage.

#### Scenario: Invalid cursor identity is limited to cursor parsing failures
- **WHEN** cursor decoding/shape validation fails
- **THEN** the response example SHALL use canonical invalid-cursor identity only

#### Scenario: Invalid date range identity is limited to from/to validation failures
- **WHEN** request date bounds are invalid (including `from > to`)
- **THEN** the response example SHALL use canonical invalid-date-range identity only

### Requirement: Canonical 409 examples are grouped by domain rule
Conflict examples MUST be cataloged and mapped by domain-specific business rules.

#### Scenario: Transaction conflict identities remain distinct
- **WHEN** conflict examples for transactions are documented
- **THEN** cataloged/mapped examples SHALL preserve distinct canonical identities for archived account, archived category, and category-type mismatch

#### Scenario: Budget conflict identities remain distinct
- **WHEN** conflict examples for budgets are documented
- **THEN** cataloged/mapped examples SHALL preserve distinct canonical identities for duplicate budget and category-availability ownership constraints

### Requirement: ProblemDetails examples are sanitized
Canonical examples MUST avoid implementation details and secret-like values.

#### Scenario: Example detail excludes internals
- **WHEN** canonical ProblemDetails examples include `detail`
- **THEN** `detail` SHALL NOT expose stack traces, SQL internals, or infrastructure topology

#### Scenario: Example detail excludes secret-like data
- **WHEN** canonical ProblemDetails examples include auth context
- **THEN** examples SHALL NOT contain token-like or credential-like values

### Requirement: Cookie-based refresh failures are canonically mapped
ProblemDetails catalog MUST explicitly cover cookie-transport auth failures without leaking token internals.

#### Scenario: Missing or invalid refresh cookie maps to canonical unauthorized
- **WHEN** `POST /auth/refresh` is called without `bb_refresh` cookie or with malformed/expired cookie value
- **THEN** response SHALL use canonical `401` ProblemDetails (`type=https://api.budgetbuddy.dev/problems/unauthorized`, `title=Unauthorized`, `status=401`)

#### Scenario: Revoked or reused refresh cookie maps to canonical forbidden
- **WHEN** refresh token represented by `bb_refresh` is revoked or reuse-detected
- **THEN** response SHALL use canonical `403` ProblemDetails entries (`refresh-revoked` or `refresh-reuse-detected`)

### Requirement: Auth cookie error details remain sanitized
Client-visible ProblemDetails for cookie-based auth failures MUST avoid exposing token parsing internals.

#### Scenario: Refresh cookie errors do not expose token internals
- **WHEN** cookie-based refresh fails
- **THEN** `detail` SHALL NOT include raw token contents, signature diagnostics, stack traces, or persistence internals

### Requirement: Origin-blocked refresh requests map to canonical forbidden problem
Blocked origin checks for refresh MUST produce a stable ProblemDetails mapping.

#### Scenario: Blocked origin maps to origin-not-allowed
- **WHEN** `POST /auth/refresh` is rejected by origin allowlist policy
- **THEN** response SHALL be `403` `application/problem+json`
- **AND** `type` SHALL be `https://api.budgetbuddy.dev/problems/origin-not-allowed`
- **AND** `title` SHALL be `Forbidden`
- **AND** `status` SHALL be `403`

#### Scenario: Origin guard details remain sanitized
- **WHEN** origin check fails
- **THEN** `detail` SHALL avoid leaking internal policy or stacktrace internals
## Requirements
### Requirement: Canonical service-unavailable ProblemDetails identity is documented
The API contract MUST provide canonical `service-unavailable` ProblemDetails identity with exact `type`, `title`, and `status`.

#### Scenario: Catalog includes canonical service unavailable identity
- **WHEN** transient operational errors are documented
- **THEN** the catalog SHALL include canonical `503` entry (`service-unavailable`) with stable `type`, `title`, and `status`

