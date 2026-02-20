## ADDED Requirements

### Requirement: Origin-blocked refresh requests map to canonical forbidden problem
Blocked origin checks for refresh MUST produce a stable ProblemDetails mapping.

#### Scenario: Blocked origin maps to origin-not-allowed
- **WHEN** `POST /auth/refresh` is rejected by origin allowlist policy
- **THEN** response SHALL be `403` `application/problem+json`
- **AND** `type` SHALL be `https://api.budgetbuddy.dev/problems/origin-not-allowed`
- **AND** `title` SHALL be `Forbidden`
- **AND** `status` SHALL be `403`

#### Scenario: Origin guard details remain sanitized
- **WHEN** origin check fails
- **THEN** `detail` SHALL avoid leaking internal policy or stacktrace internals
