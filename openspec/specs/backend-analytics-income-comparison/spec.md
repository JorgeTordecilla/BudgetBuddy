## Purpose
Define backend analytics requirements for deterministic expected-vs-actual income comparison by month and income source.

## Requirements
### Requirement: Income analytics endpoint compares expected vs actual by month and source
The backend MUST implement `GET /analytics/income` returning deterministic integer-cent comparisons of planned and realized income by month and source for the authenticated user.

#### Scenario: Income analytics success
- **WHEN** a valid authenticated request includes valid `from` and `to` dates
- **THEN** the API SHALL return `200` with `IncomeAnalyticsOut`

#### Scenario: Source-level actual income uses explicit linkage
- **WHEN** source-level actual totals are computed
- **THEN** totals SHALL be derived from income transactions explicitly linked by `transactions.income_source_id`

#### Scenario: Source-level totals do not use heuristics
- **WHEN** analytics groups actual income by source
- **THEN** the system SHALL NOT infer attribution from merchant, note, or category name heuristics

#### Scenario: Analytics totals are integer cents only
- **WHEN** expected and actual values are aggregated
- **THEN** the system SHALL use integer cents and SHALL NOT apply floating-point rounding

#### Scenario: Archived records policy is deterministic
- **WHEN** analytics totals are produced
- **THEN** archived transactions SHALL be excluded and archived income sources SHALL follow documented inclusion policy consistently
