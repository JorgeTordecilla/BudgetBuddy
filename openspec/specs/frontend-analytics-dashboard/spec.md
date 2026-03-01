## Purpose

Define the frontend contract and behavior for authenticated analytics reporting, including date-range filtering, monthly and category views, budget overlays, deterministic ProblemDetails handling, and quality gates aligned with the BudgetBuddy API contract.

## Requirements

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

#### Scenario: Invalid URL range falls back safely using client local dates
- **WHEN** URL query params are missing or invalid for analytics date range
- **THEN** frontend SHALL fallback to default range behavior using client local month-to-date (`from=<local YYYY-MM-01>`, `to=<local today YYYY-MM-DD>`)
- **AND** SHALL avoid issuing invalid-date requests during initialization.

### Requirement: Monthly analytics trend must render income, expense, and budget overlay context
The frontend SHALL present monthly trend data with deterministic cents formatting and budget overlay indicators.

#### Scenario: Monthly trend renders table and chart
- **WHEN** by-month analytics data is returned
- **THEN** frontend SHALL render monthly rows containing `month`, `income_total_cents`, `expense_total_cents`, net value, `budget_spent_cents`, and `budget_limit_cents`
- **AND** frontend SHALL render a visual trend representation with table fallback.

#### Scenario: Missing monthly budget limits are handled safely
- **WHEN** monthly row has `budget_limit_cents` missing or equal to zero
- **THEN** frontend SHALL show `No budget`
- **AND** frontend SHALL avoid percentage calculations that would divide by zero.

### Requirement: Category analytics breakdown must support income and expense views
The frontend SHALL provide category breakdown views for both income and expense totals with deterministic ordering.

#### Scenario: Metric switching updates category ranking
- **WHEN** user switches the metric view between `expense` and `income`
- **THEN** frontend SHALL sort categories descending by the selected metric total
- **AND** displayed values SHALL use integer-cents formatting rules.

#### Scenario: Category budget overlay is rendered when present
- **WHEN** category analytics row includes budget fields
- **THEN** frontend SHALL render spent-vs-limit context and progress
- **AND** rows without usable limit SHALL display `No budget`.

### Requirement: Analytics API calls must remain contract-first and auth-safe
Analytics requests SHALL preserve existing frontend contract behavior for media types, authentication, and ProblemDetails parsing.

#### Scenario: Contract headers are preserved
- **WHEN** frontend requests analytics data
- **THEN** requests SHALL include vendor `Accept` header
- **AND** authenticated transport SHALL use bearer token with existing refresh behavior and `credentials: include`.

#### Scenario: Canonical errors are handled deterministically
- **WHEN** analytics API responds with `400`, `401`, `406`, or `429`
- **THEN** frontend SHALL parse `application/problem+json`
- **AND** frontend SHALL show deterministic feedback for each status class.

### Requirement: Date range validation must provide user-facing guidance
The analytics screen SHALL validate date ranges client-side and map backend range errors to inline feedback.

#### Scenario: Client validation prevents invalid range apply
- **WHEN** user sets `from` greater than `to`
- **THEN** frontend SHALL block apply action and render inline range guidance.

#### Scenario: Backend invalid-date-range maps to inline error
- **WHEN** analytics API returns `400` invalid-date-range ProblemDetails
- **THEN** frontend SHALL render inline validation feedback near date controls.

### Requirement: Analytics feature must meet frontend quality gates
Analytics implementation SHALL include deterministic tests and pass project verification gates.

#### Scenario: Utility coverage exists
- **WHEN** analytics utilities are added
- **THEN** money and date helper logic SHALL be covered by unit tests.

#### Scenario: UI behavior coverage exists
- **WHEN** analytics page behavior is tested
- **THEN** tests SHALL cover invalid-date-range feedback and category metric switching.

#### Scenario: Verification commands pass
- **WHEN** analytics implementation is complete
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass.

### Requirement: Analytics responsive readability
The analytics interface SHALL preserve trend and breakdown readability across mobile, tablet, and desktop by adapting chart, control, and data-summary layouts.

#### Scenario: Analytics interpretation on mobile
- **WHEN** a user opens Analytics on a small viewport
- **THEN** trend insights and category breakdown remain legible and interpretable without requiring horizontal table interaction as the primary mode

### Requirement: Analytics control consistency
Analytics range and overlay controls SHALL remain consistently accessible and understandable at all supported breakpoints.

#### Scenario: Range application with responsive controls
- **WHEN** a user updates analytics date controls and applies changes
- **THEN** control states, results, and error messaging remain coherent regardless of viewport size
