## ADDED Requirements

### Requirement: Monthly analytics aggregation
The backend MUST implement `GET /analytics/by-month` with required `from` and `to` parameters and return totals grouped by `YYYY-MM`.

#### Scenario: Monthly analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to` dates
- **THEN** the API SHALL return `200` with `AnalyticsByMonthResponse` items containing `month`, `income_total_cents`, and `expense_total_cents`

#### Scenario: Monthly analytics invalid date range
- **WHEN** `from` or `to` is missing or invalid for contract rules
- **THEN** the API SHALL return `400` as `ProblemDetails`

### Requirement: Category analytics aggregation
The backend MUST implement `GET /analytics/by-category` with required `from` and `to` parameters and return totals grouped by category.

#### Scenario: Category analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to`
- **THEN** the API SHALL return `200` with `AnalyticsByCategoryResponse` items containing `category_id`, `category_name`, `income_total_cents`, and `expense_total_cents`

### Requirement: Analytics security and media-type compliance
Analytics endpoints MUST require valid access tokens and follow shared HTTP contract behavior.

#### Scenario: Analytics unauthorized request
- **WHEN** analytics endpoints are called with missing or invalid access token
- **THEN** the API SHALL return `401` as `ProblemDetails`

#### Scenario: Analytics not acceptable media type
- **WHEN** analytics endpoints receive an unsupported `Accept` header
- **THEN** the API SHALL return `406` as `ProblemDetails`
