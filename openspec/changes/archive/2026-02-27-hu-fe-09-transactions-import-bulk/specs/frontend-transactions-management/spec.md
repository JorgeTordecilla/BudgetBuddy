## MODIFIED Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions experience under the private app shell, including bulk import entry points.

#### Scenario: Import route is available under app shell
- **WHEN** an authenticated user navigates to `/app/transactions/import`
- **THEN** the import page SHALL render within `AppShell`
- **AND** unauthenticated access SHALL follow existing auth guard behavior.

### Requirement: Transaction ProblemDetails handling must be deterministic
The frontend SHALL parse `application/problem+json` and provide canonical status/type-specific feedback.

#### Scenario: Import request error handling is canonical
- **WHEN** `POST /transactions/import` returns `400`, `401`, `403`, `406`, `409`, or `429`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** present deterministic request-level feedback without losing prior input.

### Requirement: Transactions page must reuse global frontend quality standards
The transactions experience SHALL follow the established frontend policy for state handling, accessibility, responsiveness, and verification.

#### Scenario: Import quality gates are executed
- **WHEN** bulk import implementation is verified
- **THEN** parser and import page tests SHALL run under `npm run test`
- **AND** `npm run test:coverage` SHALL remain at or above project thresholds
- **AND** `npm run build` SHALL pass.

## ADDED Requirements

### Requirement: Bulk import request composition must be contract-safe
The frontend SHALL compose import payloads that match `TransactionImportRequest` and use existing API client transport/auth behavior.

#### Scenario: Import uses full request object input
- **WHEN** user provides JSON object with `mode` and `items`
- **THEN** frontend SHALL submit that structure to `POST /transactions/import`
- **AND** request SHALL use vendor media type headers via shared API client.

#### Scenario: Import uses convenience array input
- **WHEN** user provides JSON array of transaction items
- **THEN** frontend SHALL compose body as `{ mode: <selected_mode>, items: <array> }`
- **AND** submit it to `POST /transactions/import`.

#### Scenario: Auth/session behavior is preserved for import
- **WHEN** import request receives `401`
- **THEN** frontend SHALL use existing refresh flow and retry once
- **AND** if refresh fails, user SHALL follow existing logout/redirect behavior.

### Requirement: Bulk import parser must provide deterministic client-side validation
The frontend SHALL validate and normalize textarea input before submitting import requests.

#### Scenario: Invalid JSON blocks import
- **WHEN** pasted input is not valid JSON
- **THEN** frontend SHALL show inline parse error
- **AND** disable import action.

#### Scenario: Required field validation blocks import
- **WHEN** any item is missing required fields or has invalid primitive formats
- **THEN** frontend SHALL show deterministic validation messages
- **AND** prevent request submission.

#### Scenario: Basic payload size guard warns user
- **WHEN** pasted content exceeds configured size threshold
- **THEN** frontend SHALL show a non-blocking warning before submit.

### Requirement: Bulk import result visualization must expose row-level failures
The frontend SHALL render `TransactionImportResult` with summary counters and per-row failure details.

#### Scenario: Successful partial import displays summary and failures
- **WHEN** API responds `200` with `created_count`, `failed_count`, and `failures[]`
- **THEN** frontend SHALL render created/failed summary
- **AND** display each failure row with `index`, `message`, and optional ProblemDetails fields.

#### Scenario: Post-import data refresh is deterministic
- **WHEN** import request returns `200`
- **THEN** frontend SHALL invalidate transaction and analytics query families
- **AND** budgets-related overlays MAY be invalidated where coupled to analytics display.
