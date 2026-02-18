## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Archived account conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` references an account whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, and `status=409`
