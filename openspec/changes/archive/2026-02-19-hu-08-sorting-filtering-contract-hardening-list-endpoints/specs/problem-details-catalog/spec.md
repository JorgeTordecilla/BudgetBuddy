## ADDED Requirements

### Requirement: Canonical invalid date range ProblemDetails
The API SHALL expose a canonical ProblemDetails definition for invalid transaction date ranges.

#### Scenario: Canonical fields are exact for invalid date range
- **WHEN** runtime emits invalid date range errors for list endpoints
- **THEN** the payload SHALL use exact `type=https://api.budgetbuddy.dev/problems/invalid-date-range`, `title=Invalid date range`, `status=400`

#### Scenario: Media type for invalid date range errors
- **WHEN** invalid date range is returned
- **THEN** the response `Content-Type` SHALL be `application/problem+json`
