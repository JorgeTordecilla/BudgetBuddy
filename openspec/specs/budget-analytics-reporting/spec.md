## Purpose
Define analytics and reporting contract expectations, including deterministic aggregation and archive-policy behavior.
## Requirements
### Requirement: Monthly analytics aggregation
The backend MUST implement `GET /analytics/by-month` with required `from` and `to` parameters and return totals grouped by `YYYY-MM`, computed deterministically using integer cents only, with budget comparison fields when a matching monthly category budget exists.

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

### Requirement: Category analytics aggregation
The backend MUST implement `GET /analytics/by-category` with required `from` and `to` parameters and return totals grouped by category, computed deterministically using integer cents only, with budget comparison fields when matching monthly category budgets exist in range.

#### Scenario: Category analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to`
- **THEN** the API SHALL return `200` with `AnalyticsByCategoryResponse` items containing `category_id`, `category_name`, `income_total_cents`, and `expense_total_cents`

#### Scenario: Category totals use integer cents only
- **WHEN** category analytics totals are calculated
- **THEN** the system SHALL aggregate using integer `amount_cents` values and SHALL NOT apply floating-point rounding

#### Scenario: Category totals preserve user currency consistency
- **WHEN** category analytics data is generated for one authenticated user
- **THEN** all totals SHALL represent that user's single `currency_code` context and SHALL NOT mix currencies

#### Scenario: Category analytics include spent versus limit values
- **WHEN** matching budgets exist for category-month periods included in the requested date range
- **THEN** the API SHALL expose deterministic integer-cents spent-versus-limit context without introducing non-integer rounding behavior

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

