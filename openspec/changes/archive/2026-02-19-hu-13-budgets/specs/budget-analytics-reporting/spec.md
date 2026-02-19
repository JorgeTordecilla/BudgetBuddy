## MODIFIED Requirements

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
