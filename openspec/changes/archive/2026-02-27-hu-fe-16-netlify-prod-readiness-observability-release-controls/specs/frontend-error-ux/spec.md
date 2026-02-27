## MODIFIED Requirements

### Requirement: Global Error / ProblemDetails UX + Request-Id
Frontend MUST provide a centralized, consistent error experience that preserves support diagnostics through ProblemDetails mapping and request correlation identifiers.

#### Scenario: Error telemetry carries ProblemDetails correlation context
- **WHEN** frontend captures an API failure represented as ProblemDetails
- **THEN** telemetry payload SHALL include `problem.type`, `problem.title`, and `problem.status`
- **AND** SHALL include `X-Request-Id` when available.

#### Scenario: Error telemetry carries request route/method context
- **WHEN** frontend captures API-level failures in production observability
- **THEN** telemetry payload SHALL include endpoint path and HTTP method context
- **AND** diagnostics SHALL remain compatible with request-id based support workflows.

#### Scenario: Sensitive auth data is not emitted to observability providers
- **WHEN** frontend reports runtime or API errors
- **THEN** access tokens, refresh cookies, and credential payloads SHALL NOT be attached to events
- **AND** only allowlisted diagnostic metadata SHALL be emitted.
