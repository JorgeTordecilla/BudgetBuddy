## ADDED Requirements

### Requirement: OpenAPI defines savings-goal endpoints and responses
OpenAPI contract MUST define all savings-goal and contribution lifecycle endpoints with vendor success media type and ProblemDetails errors.

#### Scenario: Savings-goal CRUD and actions are documented
- **WHEN** OpenAPI paths are reviewed
- **THEN** it includes `/savings-goals`, `/savings-goals/{goal_id}`, `/savings-goals/{goal_id}/complete`, `/savings-goals/{goal_id}/cancel`, `/savings-goals/{goal_id}/contributions`, `/savings-goals/{goal_id}/contributions/{contribution_id}`, and `/savings-goals/summary`.

#### Scenario: Success and error media types are canonical
- **WHEN** savings endpoints return success or failure
- **THEN** success responses use `application/vnd.budgetbuddy.v1+json` (except `204`) and failures use `application/problem+json`.

### Requirement: OpenAPI schemas define savings-goal computed payloads
OpenAPI components MUST include schemas for savings goals, contributions, detail, and summary payloads.

#### Scenario: Goal and contribution schemas are present
- **WHEN** components are reviewed
- **THEN** it includes create/update/out schemas for goals and contributions.

#### Scenario: Computed fields are contractually explicit
- **WHEN** goal list/detail schemas are reviewed
- **THEN** they include `saved_cents`, `remaining_cents`, and `progress_pct` as response fields.

### Requirement: OpenAPI maps canonical savings ProblemDetails
Savings responses MUST reference canonical savings error identities.

#### Scenario: Error response mapping includes all canonical savings problem types
- **WHEN** OpenAPI error responses are reviewed
- **THEN** examples/references include:
  - `savings-goal-invalid-target`
  - `savings-goal-category-type-mismatch`
  - `savings-goal-deadline-past`
  - `savings-goal-not-active`
  - `savings-contribution-invalid-amount`
  - `savings-goal-already-completed`.
