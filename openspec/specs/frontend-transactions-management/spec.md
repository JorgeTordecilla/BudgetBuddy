## Purpose
Define frontend behavior for transactions management, including list workflows, mutation flows, import/export operations, URL-synced filters, and contract-safe error handling.

## Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions experience under the private app shell, including import and export entry points, and SHALL keep transaction filters synchronized with URL state.

#### Scenario: Route is available under app shell
- **WHEN** an authenticated user navigates to `/app/transactions`
- **THEN** the transactions page SHALL render within `AppShell`
- **AND** unauthenticated access SHALL follow existing auth guard behavior.

#### Scenario: Import route is available under app shell
- **WHEN** an authenticated user navigates to `/app/transactions/import`
- **THEN** the import page SHALL render within `AppShell`
- **AND** unauthenticated access SHALL follow existing auth guard behavior.

#### Scenario: Export action is available within transactions workflow
- **WHEN** an authenticated user opens `/app/transactions`
- **THEN** the transactions UI SHALL provide an `Export CSV` action within the transactions action menu
- **AND** unauthenticated access SHALL continue to follow existing auth guard behavior.

#### Scenario: Transactions list uses contract headers and supports cursor pagination
- **WHEN** the transactions page fetches list data
- **THEN** it SHALL call `GET /transactions` with vendor `Accept` header and auth context
- **AND** it SHALL support cursor-based pagination using `next_cursor`.

#### Scenario: Transactions route accepts initial filters from URL query
- **WHEN** user navigates to `/app/transactions` with valid query params (`from`, `to`, `type`, optional `account_id`, optional `category_id`)
- **THEN** frontend SHALL initialize filters from URL values
- **AND** initial transactions list request SHALL use the URL-provided filters.

#### Scenario: URL changes after mount resync filters
- **WHEN** search params change after first render through navigation or browser history
- **THEN** frontend SHALL resynchronize filter state from URL values
- **AND** list query SHALL refetch using synchronized filters.

#### Scenario: Applying filters writes normalized URL params
- **WHEN** user changes filters in the transactions screen
- **THEN** frontend SHALL update URL query params with normalized keys and values
- **AND** shared or reloaded URL SHALL reproduce the same filter state.

#### Scenario: Invalid query filters fall back safely using client local range
- **WHEN** URL query params are invalid or unsupported
- **THEN** frontend SHALL fallback to existing default filter values using client local month-to-date for `from` and `to`
- **AND** SHALL avoid emitting invalid list requests from initialization.

### Requirement: Transaction create and update flows must follow contract
The frontend SHALL support creating and updating transactions with deterministic payload and response handling.

#### Scenario: Create transaction submits valid payload
- **WHEN** user submits the create form with valid fields
- **THEN** frontend SHALL call `POST /transactions` using vendor media type
- **AND** on success the list SHALL refresh to include the new transaction.

#### Scenario: Update transaction submits partial payload
- **WHEN** user edits an existing transaction
- **THEN** frontend SHALL call `PATCH /transactions/{transaction_id}` with only changed fields
- **AND** on success the list SHALL reflect updated values.

### Requirement: Transaction soft-delete lifecycle must be supported
The frontend SHALL support archive and restore actions through contract-defined endpoints.

#### Scenario: Archive transaction
- **WHEN** user confirms archive action for an active transaction
- **THEN** frontend SHALL call `DELETE /transactions/{transaction_id}`
- **AND** success `204` SHALL remove the item from active list (or update archived state in archived view).

#### Scenario: Restore archived transaction
- **WHEN** user triggers restore on an archived transaction
- **THEN** frontend SHALL call `PATCH /transactions/{transaction_id}` with `{ "archived_at": null }`
- **AND** the transaction SHALL return to active state in UI after successful response.

### Requirement: Transaction ProblemDetails handling must be deterministic
The frontend SHALL parse `application/problem+json` and provide canonical status/type-specific feedback.

#### Scenario: Canonical status handling
- **WHEN** transactions API returns `400`, `401`, `403`, `406`, or `409`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** present deterministic user-facing feedback for each status class.

#### Scenario: Category type mismatch conflict is mapped explicitly
- **WHEN** API returns `409` with ProblemDetails type for `category-type-mismatch`
- **THEN** frontend SHALL show a specific message explaining transaction type/category type mismatch.

#### Scenario: Import request error handling is canonical
- **WHEN** `POST /transactions/import` returns `400`, `401`, `403`, `406`, `409`, or `429`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** present deterministic request-level feedback without losing prior input.

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

#### Scenario: Page states and accessibility are explicit
- **WHEN** the page is rendered or mutated
- **THEN** loading, empty, success, and error states SHALL be explicit
- **AND** interactive controls/dialogs SHALL remain keyboard-accessible.

#### Scenario: Quality gates are executed
- **WHEN** implementation is verified
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass
- **AND** coverage SHALL meet project frontend thresholds.

#### Scenario: Import quality gates are executed
- **WHEN** bulk import implementation is verified
- **THEN** parser and import page tests SHALL run under `npm run test`
- **AND** `npm run test:coverage` SHALL remain at or above project thresholds
- **AND** `npm run build` SHALL pass.

#### Scenario: Export quality gates are executed
- **WHEN** export implementation is verified
- **THEN** `npm run test` SHALL pass
- **AND** `npm run test:coverage` SHALL remain at or above project thresholds
- **AND** `npm run build` SHALL pass.

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

### Requirement: Transactions responsive data rendering
The transactions page SHALL provide card/list rendering on small viewports and dense table rendering on larger viewports using the same underlying data and actions.

#### Scenario: Transactions without mobile horizontal dependency
- **WHEN** a user opens Transactions on a small viewport
- **THEN** transaction records are readable and actionable without requiring horizontal table scrolling

### Requirement: Transactions action accessibility
Transactions actions (create, edit, archive, restore, import, export) SHALL remain discoverable and operable across breakpoints with keyboard and touch support.

#### Scenario: Action parity across viewport sizes
- **WHEN** a user performs transaction actions on mobile or desktop
- **THEN** equivalent actions are available with clear affordances and consistent feedback states
