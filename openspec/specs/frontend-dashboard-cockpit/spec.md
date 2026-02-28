## Purpose

Define the frontend contract and behavior for the authenticated dashboard cockpit, including month-health KPIs, deterministic alerts, contextual bridge navigation, and quality/error handling aligned with BudgetBuddy API contracts.

## Requirements

### Requirement: Dashboard cockpit must provide authenticated month-health snapshot
The frontend SHALL expose an authenticated cockpit view at `/app/dashboard` that summarizes selected-month financial health.

#### Scenario: Cockpit route renders in authenticated app shell
- **WHEN** an authenticated user navigates to `/app/dashboard`
- **THEN** frontend SHALL render cockpit content inside `AppShell`
- **AND** unauthenticated access SHALL continue to follow existing auth guard behavior.

#### Scenario: Month selector defaults to current month
- **WHEN** cockpit page loads
- **THEN** selected month SHALL default to current month
- **AND** frontend SHALL support switching to prior recent months.

### Requirement: Cockpit KPIs must be derived from analytics by-month contract
Cockpit summary cards SHALL use `GET /analytics/by-month` for selected-month totals.

#### Scenario: KPI cards render month totals
- **WHEN** selected-month analytics data is available
- **THEN** cockpit SHALL render `income_total_cents`, `expense_total_cents`, and `net = income - expense`
- **AND** values SHALL use user currency formatting from session context.

#### Scenario: Budget progress renders spent-vs-limit safely
- **WHEN** selected-month analytics includes budget fields
- **THEN** cockpit SHALL render `budget_spent_cents` vs `budget_limit_cents` and progress percentage
- **AND** if limit is missing or zero cockpit SHALL render `No budgets set`.

### Requirement: Cockpit alerts must include over-budget categories and spending spikes
Cockpit SHALL provide deterministic, explainable alert sections from existing APIs.

#### Scenario: Over-budget categories are derived from analytics by-category
- **WHEN** category analytics row has `budget_limit_cents > 0` and `budget_spent_cents > budget_limit_cents`
- **THEN** cockpit SHALL list category as over-budget
- **AND** each alert SHALL include spent, limit, and overrun amount.

#### Scenario: Spending spikes are computed from expense sample
- **WHEN** cockpit receives month expense sample from `GET /transactions` and sample size is at least 8
- **THEN** frontend SHALL compute median `amount_cents`
- **AND** SHALL flag spike items where `amount_cents >= 3 * median` and `amount_cents >= minSpikeCents`.

#### Scenario: Spikes section handles insufficient sample deterministically
- **WHEN** expense sample size is below 8
- **THEN** cockpit SHALL show a deterministic `Not enough data` message
- **AND** SHALL avoid spike inference.

### Requirement: Cockpit actions and bridges must navigate with actionable context
Cockpit SHALL expose primary actions and deep links that preserve selected-month context.

#### Scenario: Primary cockpit actions are available
- **WHEN** cockpit renders
- **THEN** cockpit SHALL include actions for add transaction, review budgets, and analytics.

#### Scenario: Budgets bridge preserves selected month
- **WHEN** user opens budgets from cockpit
- **THEN** frontend SHALL navigate to `/app/budgets?month=<YYYY-MM>`.

#### Scenario: Transactions bridge preserves selected date range
- **WHEN** user opens transactions from cockpit alerts
- **THEN** frontend SHALL navigate with prefilled range query params (`from`, `to`, and `type=expense` for spike review).

#### Scenario: Analytics bridge preserves selected date range
- **WHEN** user opens analytics from cockpit
- **THEN** frontend SHALL navigate to `/app/analytics?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`.

### Requirement: Cockpit must align with global error UX and quality gates
Cockpit behavior SHALL follow established ProblemDetails handling and frontend verification standards.

#### Scenario: Cockpit API failures use global ProblemDetails UX
- **WHEN** cockpit requests fail with `application/problem+json`
- **THEN** frontend SHALL render mapped user-facing errors
- **AND** SHALL expose `X-Request-Id` where available.

#### Scenario: Cockpit quality gates pass
- **WHEN** cockpit implementation is verified
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass
- **AND** coverage SHALL remain at or above project frontend thresholds.

### Requirement: Dashboard mobile action clarity
The dashboard SHALL prioritize month health, top risks, and next actions in a mobile-first layout with clear CTA hierarchy.

#### Scenario: Dashboard quick decisions on mobile
- **WHEN** a user opens Dashboard on a small viewport
- **THEN** health status, risk alerts, and the highest-priority action are visible without horizontal scrolling

### Requirement: Responsive KPI composition
Dashboard KPI sections SHALL adapt density by breakpoint while preserving semantic grouping and readability.

#### Scenario: KPI readability across breakpoints
- **WHEN** the viewport changes between mobile, tablet, and desktop
- **THEN** KPI blocks reflow to appropriate columns and keep labels, values, and state cues readable
