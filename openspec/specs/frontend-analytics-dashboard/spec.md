## Purpose

Define the frontend contract and behavior for authenticated analytics reporting, including date-range filtering, monthly and category views, budget overlays, deterministic ProblemDetails handling, and quality gates aligned with the BeBudget API contract.

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
The frontend SHALL present monthly trend data with currency-aware formatting and budget overlay indicators.

#### Scenario: Monthly trend renders table and chart
- **WHEN** by-month analytics data is returned
- **THEN** frontend SHALL render monthly rows containing `month`, `income_total_cents`, `expense_total_cents`, net value, `budget_spent_cents`, and `budget_limit_cents`
- **AND** frontend SHALL render a visual trend representation with table fallback.

#### Scenario: Missing monthly budget limits are handled safely
- **WHEN** monthly row has `budget_limit_cents` missing or equal to zero
- **THEN** frontend SHALL show `No budget`
- **AND** frontend SHALL avoid percentage calculations that would divide by zero.

#### Scenario: Monthly analytics values are formatted using user currency
- **WHEN** monthly totals are displayed in cards, table rows, and chart tooltips
- **THEN** frontend SHALL format values from cents with authenticated user `currency_code`
- **AND** SHALL avoid raw cents display in primary analytics value surfaces.

#### Scenario: Expected vs actual income summary remains scale-correct
- **WHEN** frontend displays expected and actual income summaries
- **THEN** values SHALL reflect integer-cents semantics converted to major units once
- **AND** user-entered major-unit amounts SHALL not appear 100x smaller or larger in analytics UI.

#### Scenario: Budget usage excludes income-category budget limits
- **WHEN** the analytics summary card displays `Budget usage`
- **THEN** the displayed limit SHALL reflect only expense-category budget limits
- **AND** budgets configured on income categories SHALL NOT inflate the budget usage denominator.

### Requirement: Category analytics breakdown must support income and expense views
The frontend SHALL provide category breakdown views for both income and expense totals with deterministic ordering and domain-appropriate budget semantics.

#### Scenario: Metric switching updates category ranking
- **WHEN** user switches the metric view between `expense` and `income`
- **THEN** frontend SHALL filter category rows by matching `category_type` (`expense` tab => `expense`, `income` tab => `income`)
- **AND** frontend SHALL sort remaining categories descending by the selected metric total
- **AND** displayed values SHALL use integer-cents formatting rules.

#### Scenario: Category budget overlay is rendered with domain semantics
- **WHEN** category analytics row has `category_type = expense` and `budget_limit_cents > 0`
- **THEN** frontend SHALL render spent-vs-budget context using `budget_spent_cents` and `budget_limit_cents`
- **AND** show progress as spent over limit.

#### Scenario: Income category target overlay is rendered when present
- **WHEN** category analytics row has `category_type = income` and `budget_limit_cents > 0`
- **THEN** frontend SHALL render actual-vs-target context using `income_total_cents` and `budget_limit_cents`
- **AND** show progress as achieved over target.

#### Scenario: Rows without configured budget target show No budget
- **WHEN** category analytics row has `budget_limit_cents = 0`
- **THEN** frontend SHALL render `No budget` consistently for both category domains.

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

#### Scenario: Analytics filter controls avoid mobile overflow
- **WHEN** date range controls are rendered on a small viewport
- **THEN** controls SHALL reflow in a mobile-first layout that keeps each control fully visible
- **AND** native `input[type="date"]` controls SHALL NOT overflow their parent container width on iOS Safari/Chrome/Brave and Android Chrome/Brave.

### Requirement: Analytics control consistency
Analytics range and overlay controls SHALL remain consistently accessible and understandable at all supported breakpoints.

#### Scenario: Range application with responsive controls
- **WHEN** a user updates analytics date controls and applies changes
- **THEN** control states, results, and error messaging remain coherent regardless of viewport size

#### Scenario: Touch-first range actions on narrow viewports
- **WHEN** analytics controls are shown on narrow screens
- **THEN** primary range-apply affordance SHALL remain easily tappable
- **AND** control ordering SHALL preserve comprehension from range selection to apply action.

### Requirement: Analytics dashboard shows rollover-in KPI and trend context
The frontend analytics page SHALL expose rollover preview values from by-month data as a first-class visual signal.

#### Scenario: Rollover-in KPI is visible for latest month context
- **WHEN** by-month analytics is loaded
- **THEN** UI SHALL render a `Rollover in` KPI using the latest selected month `rollover_in_cents` formatted in user currency.

#### Scenario: Trend visualization includes rollover-in series
- **WHEN** month trend chart is rendered
- **THEN** chart SHALL include an additional rollover-in series aligned by month.

### Requirement: Analytics dashboard supports explicit rollover apply flow
The frontend SHALL provide per-month rollover apply actions gated by preview state.

#### Scenario: Apply affordance appears only when surplus is actionable
- **WHEN** rollover preview for source month returns `surplus_cents > 0` and `already_applied = false`
- **THEN** UI SHALL show `Apply rollover` action for that month.

#### Scenario: Apply modal enforces required inputs and confirms computed amount
- **WHEN** user opens apply action
- **THEN** modal SHALL display read-only computed surplus and require valid `account_id` plus `income` category before submit.

#### Scenario: Successful apply updates UX and cache coherently
- **WHEN** apply request succeeds
- **THEN** UI SHALL show applied confirmation state and invalidate analytics + transactions queries for fresh data.

#### Scenario: Apply and preview errors follow ProblemDetails UX
- **WHEN** rollover APIs return canonical errors (`401`, `409`, `422`)
- **THEN** UI SHALL map responses through existing ProblemDetails handling and display deterministic feedback.

### Requirement: Analytics dashboard shows impulse KPI counters for active range
The analytics page SHALL render impulse behavior KPI cards scoped to the active range.

#### Scenario: Impulse and intentional KPI cards render with summary data
- **WHEN** `GET /analytics/impulse-summary` returns data for active range
- **THEN** UI SHALL render `Impulse` and `Intentional` KPI cards using returned counts.

### Requirement: Analytics dashboard renders top impulse categories and zero state
The analytics page SHALL provide readable impulse category insight and explicit empty-state behavior.

#### Scenario: Top impulse categories render up to five rows
- **WHEN** summary response contains `top_impulse_categories`
- **THEN** UI SHALL render up to five category rows with impulse counts.

#### Scenario: Zero state is explicit when no tagged transactions exist
- **WHEN** summary response contains zero counters and empty top categories
- **THEN** UI SHALL show `No tagged transactions yet` instead of empty KPI/category placeholders.

### Requirement: Impulse summary failures are non-blocking in analytics
Impulse summary loading errors SHALL not break the rest of analytics rendering.

#### Scenario: Summary error keeps analytics page functional
- **WHEN** impulse summary request fails
- **THEN** impulse section SHALL show non-blocking error state
- **AND** other analytics sections SHALL continue rendering and updating normally.
