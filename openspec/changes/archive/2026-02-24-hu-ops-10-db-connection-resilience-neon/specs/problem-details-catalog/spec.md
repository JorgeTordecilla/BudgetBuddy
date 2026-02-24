## ADDED Requirements

### Requirement: Canonical service-unavailable ProblemDetails identity is documented
The API contract MUST provide canonical `service-unavailable` ProblemDetails identity with exact `type`, `title`, and `status`.

#### Scenario: Catalog includes canonical service unavailable identity
- **WHEN** transient operational errors are documented
- **THEN** the catalog SHALL include canonical `503` entry (`service-unavailable`) with stable `type`, `title`, and `status`
