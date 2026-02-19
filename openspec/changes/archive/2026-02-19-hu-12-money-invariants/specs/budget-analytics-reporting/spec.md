## MODIFIED Requirements

### Requirement: Monthly analytics aggregation
The backend MUST implement `GET /analytics/by-month` with required `from` and `to` parameters and return totals grouped by `YYYY-MM`, computed deterministically using integer cents only.

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

### Requirement: Category analytics aggregation
The backend MUST implement `GET /analytics/by-category` with required `from` and `to` parameters and return totals grouped by category, computed deterministically using integer cents only.

#### Scenario: Category analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to`
- **THEN** the API SHALL return `200` with `AnalyticsByCategoryResponse` items containing `category_id`, `category_name`, `income_total_cents`, and `expense_total_cents`

#### Scenario: Category totals use integer cents only
- **WHEN** category analytics totals are calculated
- **THEN** the system SHALL aggregate using integer `amount_cents` values and SHALL NOT apply floating-point rounding

#### Scenario: Category totals preserve user currency consistency
- **WHEN** category analytics data is generated for one authenticated user
- **THEN** all totals SHALL represent that user's single `currency_code` context and SHALL NOT mix currencies
