## MODIFIED Requirements

### Requirement: Authenticated analytics route and date-range queries must be available
The frontend SHALL expose an authenticated analytics page under the app shell, load analytics data by explicit date range, and keep range state synchronized with URL query parameters.

#### Scenario: Route is available under app shell
- **WHEN** an authenticated user navigates to `/app/analytics`
- **THEN** the analytics page SHALL render within `AppShell`
- **AND** unauthenticated users SHALL follow existing auth guard behavior.

#### Scenario: Analytics queries execute for selected range
- **WHEN** user applies a valid `from` and `to` date range
- **THEN** frontend SHALL call:
- `GET /analytics/by-month?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`
- `GET /analytics/by-category?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`
- **AND** the UI SHALL render explicit loading, empty, success, and error states.

#### Scenario: Analytics route accepts initial range from URL query
- **WHEN** user navigates to `/app/analytics?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`
- **THEN** frontend SHALL initialize draft and applied range state from query params when valid
- **AND** initial analytics requests SHALL use that URL-provided range.

#### Scenario: URL range changes after mount resync state
- **WHEN** URL query changes after initial render through links, back, or forward navigation
- **THEN** frontend SHALL resynchronize draft and applied range state from URL
- **AND** analytics queries SHALL execute using synchronized range.

#### Scenario: Applying range updates URL deterministically
- **WHEN** user applies a new valid range from analytics controls
- **THEN** frontend SHALL update URL query params for `from` and `to`
- **AND** copied/reloaded URL SHALL reproduce the same analytics view.

#### Scenario: Invalid URL range falls back safely
- **WHEN** URL query params are missing or invalid for analytics date range
- **THEN** frontend SHALL fallback to existing default range behavior
- **AND** SHALL avoid issuing invalid-date requests during initialization.

