## ADDED Requirements

### Requirement: Rollover ownership and resource-state failures use canonical HTTP semantics
Rollover apply MUST distinguish authorization failures from business-rule conflicts using canonical ProblemDetails responses.

#### Scenario: Foreign rollover account or category is forbidden
- **WHEN** an authenticated user supplies rollover account/category resources not owned by them
- **THEN** the API SHALL return `403` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/forbidden`, `title=Forbidden`, `status=403`.

#### Scenario: Archived owned rollover resource remains conflict
- **WHEN** rollover apply is attempted with an owned but archived account or owned but archived income category
- **THEN** the API SHALL return `409` with `application/problem+json`
- **AND** ownership failures SHALL NOT be represented as `409`.
