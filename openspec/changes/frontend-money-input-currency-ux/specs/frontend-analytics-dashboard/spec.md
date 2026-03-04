## MODIFIED Requirements

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
