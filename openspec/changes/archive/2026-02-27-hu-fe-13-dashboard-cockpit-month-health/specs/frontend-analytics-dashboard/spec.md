## MODIFIED Requirements

### Requirement: Authenticated analytics route and date-range queries must be available
The frontend SHALL expose an authenticated analytics page under the app shell and load analytics data by an explicit date range.

#### Scenario: Analytics route accepts initial range from URL query
- **WHEN** user navigates to `/app/analytics?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`
- **THEN** frontend SHALL initialize draft and applied range state from query params when valid
- **AND** initial analytics requests SHALL use that URL-provided range.

#### Scenario: Invalid URL range falls back safely
- **WHEN** URL query params are missing or invalid for analytics date range
- **THEN** frontend SHALL fallback to existing default range behavior
- **AND** SHALL avoid issuing invalid-date requests during initialization.
