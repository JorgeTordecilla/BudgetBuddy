## Purpose
Define analytics and reporting contract expectations, including deterministic aggregation and archive-policy behavior.
## Requirements
### Requirement: Monthly analytics aggregation
The backend MUST implement `GET /analytics/by-month` with required `from` and `to` parameters and return deterministic totals grouped by `YYYY-MM`, including additive expected-vs-actual income fields, while deriving monthly and rollover values from one extended-range monthly aggregation source.

#### Scenario: Monthly analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to` dates
- **THEN** the API SHALL return `200` with `AnalyticsByMonthResponse` items containing `month`, `income_total_cents`, and `expense_total_cents`

#### Scenario: Monthly analytics invalid date range
- **WHEN** `from` or `to` is missing or invalid for contract rules
- **THEN** the API SHALL return `400` as `ProblemDetails`

#### Scenario: Monthly totals use integer cents only
- **WHEN** monthly analytics totals are calculated
- **THEN** the system SHALL aggregate using integer `amount_cents` values and SHALL NOT apply floating-point rounding

#### Scenario: Monthly totals preserve user currency consistency
- **WHEN** monthly analytics data is generated for one authenticated user
- **THEN** all totals SHALL represent that user's single `currency_code` context and SHALL NOT mix currencies

#### Scenario: Monthly analytics include budget comparison context
- **WHEN** a month/category slice has a matching budget for the authenticated user
- **THEN** analytics output SHALL include integer-cents budget comparison values for spent and limit without changing existing totals semantics

#### Scenario: Monthly analytics response remains backward compatible
- **WHEN** `GET /analytics/by-month` succeeds
- **THEN** existing fields (`month`, `income_total_cents`, `expense_total_cents`, `budget_spent_cents`, `budget_limit_cents`) SHALL remain present and semantically unchanged

#### Scenario: Monthly analytics includes additive expected-vs-actual income
- **WHEN** monthly analytics is computed
- **THEN** each row SHALL include `expected_income_cents` and `actual_income_cents` as integer fields

#### Scenario: Actual income in monthly response is transaction-derived
- **WHEN** `actual_income_cents` is computed for a month
- **THEN** value SHALL be derived from non-archived transactions of type `income` within that month for the authenticated user

#### Scenario: Expected income in monthly response is source-derived
- **WHEN** `expected_income_cents` is computed for a month
- **THEN** value SHALL be derived from active income sources according to the documented frequency policy
- **AND** `expected_income_cents` SHALL be computed per returned month
- **AND** the implementation SHALL NOT reuse one static scalar for all months in range.

#### Scenario: By-month and income endpoints remain semantically aligned
- **WHEN** `/analytics/by-month` and `/analytics/income` are queried for the same user and date window
- **THEN** monthly `expected_income_cents` values SHALL follow the same source-selection and frequency policy.

#### Scenario: Expected income remains integer and deterministic
- **WHEN** monthly expected income is computed
- **THEN** values SHALL be integer cents and deterministic for identical inputs.

#### Scenario: Monthly budget limit excludes income-category budgets
- **WHEN** `budget_limit_cents` is computed for `GET /analytics/by-month`
- **THEN** the total SHALL include only budget limits linked to categories of type `expense`
- **AND** budget limits linked to categories of type `income` SHALL be excluded.

#### Scenario: Monthly analytics uses one extended-range transaction aggregation source
- **WHEN** `GET /analytics/by-month` computes both monthly totals and rollover context
- **THEN** the system SHALL derive both outputs from one monthly aggregate source over `prior_month_start..to`
- **AND** the implementation SHALL NOT require a second independent transaction aggregation over the same extended range.

#### Scenario: First returned month rollover remains derived from immediate prior calendar month
- **WHEN** the first returned month has no prior month inside the selected response range
- **THEN** `rollover_in_cents` SHALL still be computed from the immediate previous calendar month outside the displayed range.

#### Scenario: Sparse month histories preserve rollover semantics
- **WHEN** one or more intermediate calendar months have no transaction rows
- **THEN** rollover derivation SHALL remain deterministic and SHALL use the immediate previous calendar month semantics defined by contract.

### Requirement: Category analytics aggregation
The backend MUST implement `GET /analytics/by-category` with required `from` and `to` parameters and return totals grouped by category, computed deterministically using integer cents only, with budget comparison fields when matching monthly category budgets exist in range.

#### Scenario: Category analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to`
- **THEN** the API SHALL return `200` with `AnalyticsByCategoryResponse` items containing `category_id`, `category_name`, `category_type`, `income_total_cents`, and `expense_total_cents`

#### Scenario: Category totals use integer cents only
- **WHEN** category analytics totals are calculated
- **THEN** the system SHALL aggregate using integer `amount_cents` values and SHALL NOT apply floating-point rounding

#### Scenario: Category totals preserve user currency consistency
- **WHEN** category analytics data is generated for one authenticated user
- **THEN** all totals SHALL represent that user's single `currency_code` context and SHALL NOT mix currencies

#### Scenario: Category analytics include spent versus limit values
- **WHEN** matching budgets exist for category-month periods included in the requested date range
- **THEN** the API SHALL expose deterministic integer-cents spent-versus-limit context without introducing non-integer rounding behavior

#### Scenario: Category budget limit includes configured targets for both category domains
- **WHEN** `budget_limit_cents` is computed for `GET /analytics/by-category`
- **THEN** categories of type `expense` with matching budgets in range SHALL expose non-zero `budget_limit_cents`
- **AND** categories of type `income` with matching budgets in range SHALL expose non-zero `budget_limit_cents` as income target
- **AND** categories without matching budgets in range SHALL expose `budget_limit_cents = 0`.

#### Scenario: Category budget spent remains expense-domain semantics
- **WHEN** a by-category item has `category_type = income`
- **THEN** `budget_spent_cents` SHALL remain `0`
- **AND** income target comparison SHALL use `income_total_cents` against `budget_limit_cents`.

#### Scenario: Category analytics includes explicit category domain
- **WHEN** a by-category analytics item is returned
- **THEN** item SHALL include `category_type` with value `income` or `expense`
- **AND** `category_type` SHALL match the category domain used for transaction classification.

### Requirement: Analytics security and media-type compliance
Analytics endpoints MUST require valid access tokens and follow shared HTTP contract behavior.

#### Scenario: Analytics unauthorized request
- **WHEN** analytics endpoints are called with missing or invalid access token
- **THEN** the API SHALL return `401` as `ProblemDetails`

#### Scenario: Analytics not acceptable media type
- **WHEN** analytics endpoints receive an unsupported `Accept` header
- **THEN** the API SHALL return `406` as `ProblemDetails`

### Requirement: Analytics archived-transaction policy is explicit and deterministic
Analytics totals MUST apply one explicit policy for archived transactions.

#### Scenario: Archived transactions are excluded from analytics totals
- **WHEN** analytics endpoints compute totals by month or category
- **THEN** archived transactions SHALL be excluded from aggregates by default policy

#### Scenario: Analytics policy is stable under archive toggling
- **WHEN** a transaction is archived or restored
- **THEN** analytics totals SHALL deterministically reflect exclusion on archive and inclusion on restore

### Requirement: Monthly analytics expose additive rollover-in context
`GET /analytics/by-month` MUST include additive `rollover_in_cents` on each month item, representing prior-month positive net savings for the authenticated user.

#### Scenario: Month item shows prior-month surplus as rollover in
- **WHEN** previous calendar month has `income_total_cents > expense_total_cents`
- **THEN** current month item SHALL include `rollover_in_cents = previous income - previous expense`.

#### Scenario: Rollover in is clamped at zero for deficit months
- **WHEN** previous calendar month has `income_total_cents <= expense_total_cents`
- **THEN** current month item SHALL include `rollover_in_cents = 0`.

#### Scenario: First returned month still computes using prior month outside requested range
- **WHEN** the first item in response has no prior month inside the selected range
- **THEN** system SHALL compute `rollover_in_cents` from the immediate previous calendar month regardless of range boundary.

#### Scenario: Users without prior-month history return zero rollover in
- **WHEN** no transactions exist for the previous calendar month
- **THEN** current month item SHALL include `rollover_in_cents = 0`.

### Requirement: Analytics impulse summary endpoint reports behavior counters
The backend MUST implement `GET /analytics/impulse-summary` with date-range filters and deterministic counting semantics.

#### Scenario: Summary returns impulse, intentional, and untagged counts
- **WHEN** the endpoint is called with a valid authenticated date range
- **THEN** response SHALL include `impulse_count`, `intentional_count`, and `untagged_count` computed from `is_impulse=true|false|null`.

#### Scenario: Summary excludes archived transactions
- **WHEN** archived transactions exist in the requested range
- **THEN** archived rows SHALL NOT contribute to summary counters.

#### Scenario: Summary returns top impulse categories
- **WHEN** impulse-tagged transactions exist across categories
- **THEN** response SHALL include `top_impulse_categories` with at most five entries ordered by `count DESC`.

#### Scenario: Summary returns deterministic empty range payload
- **WHEN** no transactions exist for the requested range
- **THEN** response SHALL return `200` with all counters as `0` and `top_impulse_categories=[]`.

#### Scenario: Summary requires authentication
- **WHEN** `GET /analytics/impulse-summary` is called without valid authentication
- **THEN** the API SHALL return `401` as ProblemDetails.
