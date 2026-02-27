## MODIFIED Requirements

### Requirement: Authenticated budgets route and range list must be available
The frontend SHALL expose a protected budgets page under the authenticated app shell, support month-range list retrieval, and keep month/range controls synchronized with URL state.

#### Scenario: Route is available under app shell
- **WHEN** an authenticated user navigates to `/app/budgets`
- **THEN** the budgets page SHALL render within `AppShell`
- **AND** unauthenticated users SHALL follow existing auth guard behavior.

#### Scenario: List budgets by month range
- **WHEN** the page requests budgets for `from` and `to` in `YYYY-MM`
- **THEN** frontend SHALL call `GET /budgets?from=<YYYY-MM>&to=<YYYY-MM>`
- **AND** frontend SHALL render loading, empty, success, and error states explicitly.

#### Scenario: Range filtering applies only on explicit user action
- **WHEN** the user edits `from` or `to` inputs without pressing apply
- **THEN** frontend SHALL keep the previous applied query range for list requests
- **AND** frontend SHALL fetch with the new range only after an explicit apply action.

#### Scenario: Budgets list is deterministically ordered
- **WHEN** budget items are rendered in the table
- **THEN** frontend SHALL sort items by month descending
- **AND** frontend SHALL use category label ascending as a stable tie-breaker.

#### Scenario: Budgets route accepts initial month from URL query
- **WHEN** user navigates to `/app/budgets?month=<YYYY-MM>`
- **THEN** frontend SHALL initialize both `from` and `to` range controls using that month when valid
- **AND** initial budgets request SHALL use the URL-provided month range.

#### Scenario: URL month changes after mount resync range
- **WHEN** query param `month` changes after initial render through navigation
- **THEN** frontend SHALL resynchronize range controls and applied range from URL
- **AND** budgets queries SHALL use synchronized month range.

#### Scenario: Applying month range updates URL deterministically
- **WHEN** user applies a valid month range from budgets controls
- **THEN** frontend SHALL write normalized query params to URL
- **AND** copied/reloaded URL SHALL reproduce the same budgets range view.

#### Scenario: Invalid month query falls back safely
- **WHEN** `month` query param is absent or invalid
- **THEN** frontend SHALL fallback to existing current-month default behavior
- **AND** SHALL avoid issuing invalid month-range requests during initialization.

