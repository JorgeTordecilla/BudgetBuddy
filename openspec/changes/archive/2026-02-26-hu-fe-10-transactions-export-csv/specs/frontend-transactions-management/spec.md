## MODIFIED Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions experience under the private app shell, including import and export entry points.

#### Scenario: Export action is available within transactions workflow
- **WHEN** an authenticated user opens `/app/transactions`
- **THEN** the transactions UI SHALL provide an `Export CSV` action within the transactions action menu
- **AND** unauthenticated access SHALL continue to follow existing auth guard behavior.

### Requirement: Transaction ProblemDetails handling must be deterministic
The frontend SHALL parse `application/problem+json` and provide canonical status/type-specific feedback.

#### Scenario: Export request error handling is canonical
- **WHEN** `GET /transactions/export` returns `400`, `401`, `406`, or `429`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** present deterministic request-level feedback.

#### Scenario: Export rate-limit feedback includes retry guidance
- **WHEN** export returns `429` with `Retry-After`
- **THEN** frontend SHALL show a user-facing message that includes retry timing guidance
- **AND** SHALL not auto-retry the export request.

### Requirement: Transactions page must reuse global frontend quality standards
The transactions experience SHALL follow the established frontend policy for state handling, accessibility, responsiveness, and verification.

#### Scenario: Export quality gates are executed
- **WHEN** export implementation is verified
- **THEN** `npm run test` SHALL pass
- **AND** `npm run test:coverage` SHALL remain at or above project thresholds
- **AND** `npm run build` SHALL pass.

## ADDED Requirements

### Requirement: Transactions CSV export request must be contract-safe
The frontend SHALL request `GET /transactions/export` with filter-aware query composition, CSV content negotiation, and existing auth/session behavior.

#### Scenario: Export request composes query from active transactions filters
- **WHEN** user triggers export from the transactions page
- **THEN** frontend SHALL compose query params from active filters (`type`, `account_id`, `category_id`, `from`, `to`)
- **AND** request SHALL target `/transactions/export` using the composed query.

#### Scenario: Export request uses CSV-compatible Accept header
- **WHEN** frontend sends export request
- **THEN** it SHALL include `Accept: text/csv, application/problem+json`
- **AND** preserve authenticated transport behavior from shared API client.

#### Scenario: Export auth/session behavior is preserved
- **WHEN** export request receives `401`
- **THEN** frontend SHALL use existing refresh flow and retry once
- **AND** if refresh fails, user SHALL follow existing logout/redirect behavior.

### Requirement: Transactions CSV export must trigger deterministic browser download
The frontend SHALL download CSV responses using browser-safe blob handling and stable filename resolution.

#### Scenario: Successful export downloads CSV file
- **WHEN** API responds `200` with `text/csv`
- **THEN** frontend SHALL create a CSV download using `Blob` and object URL flow
- **AND** the file SHALL be downloaded without navigating away from the transactions page.

#### Scenario: Filename resolution is deterministic
- **WHEN** export download is prepared
- **THEN** frontend SHALL prefer filename from `Content-Disposition` if present
- **AND** fallback to `budgetbuddy-transactions-YYYYMMDD-HHmm.csv` when absent.

### Requirement: Exported CSV content must be user-facing
The transactions export contract SHALL provide analysis-ready business columns and SHALL NOT expose internal storage identifiers by default.

#### Scenario: CSV headers are business-oriented
- **WHEN** `GET /transactions/export` returns `200 text/csv`
- **THEN** header row SHALL be `date,type,account,category,amount_cents,merchant,note`
- **AND** CSV rows SHALL use account/category names instead of internal UUIDs.
