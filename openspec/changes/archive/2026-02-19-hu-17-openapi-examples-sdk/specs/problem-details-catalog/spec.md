## ADDED Requirements

### Requirement: Canonical ProblemDetails examples are reusable
The ProblemDetails catalog MUST provide reusable canonical examples for `400`, `401`, `403`, `406`, `409`, and `429`.

#### Scenario: Canonical example coverage includes required statuses
- **WHEN** the OpenAPI catalog is reviewed
- **THEN** canonical examples SHALL exist for `400`, `401`, `403`, `406`, `409`, and `429`

#### Scenario: Canonical examples use stable identity fields
- **WHEN** canonical error examples are defined
- **THEN** each example SHALL include stable `type`, `title`, and `status` values aligned with runtime helpers

### Requirement: ProblemDetails examples are sanitized
Canonical examples MUST avoid implementation details and secret-like values.

#### Scenario: Example detail excludes internals
- **WHEN** canonical ProblemDetails examples include `detail`
- **THEN** `detail` SHALL NOT expose stack traces, SQL internals, or infrastructure topology

#### Scenario: Example detail excludes secret-like data
- **WHEN** canonical ProblemDetails examples include auth context
- **THEN** examples SHALL NOT contain token-like or credential-like values
