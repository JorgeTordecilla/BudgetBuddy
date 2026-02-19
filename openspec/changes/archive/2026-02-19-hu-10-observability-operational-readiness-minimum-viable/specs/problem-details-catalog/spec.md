## ADDED Requirements

### Requirement: API error details are sanitized
ProblemDetails emitted by the API MUST avoid sensitive/internal data exposure in `detail`.

#### Scenario: Stack trace is not exposed
- **WHEN** an error path builds `ProblemDetails`
- **THEN** `detail` SHALL NOT include stack traces or exception dumps

#### Scenario: Token-like values are not exposed
- **WHEN** an error path includes request context
- **THEN** `detail` SHALL NOT include bearer tokens, JWT payloads, or secret-like values

### Requirement: API error logging has minimum structured operational fields
API error logging MUST include structured fields for traceability.

#### Scenario: APIError is logged with request context
- **WHEN** an `APIError` is handled
- **THEN** logs SHALL include `request_id`, `path`, `status`, and `problem_type`

#### Scenario: Logging avoids sensitive credentials
- **WHEN** API error context is logged
- **THEN** logs SHALL NOT include authorization header values or secret-like data
