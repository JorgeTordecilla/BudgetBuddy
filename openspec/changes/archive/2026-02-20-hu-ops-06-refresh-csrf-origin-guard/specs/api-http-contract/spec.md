## ADDED Requirements

### Requirement: Refresh endpoint contract documents origin-guarded failure mode
The HTTP contract MUST define deterministic behavior for origin-rejected refresh requests.

#### Scenario: Refresh documents canonical origin-blocked response
- **WHEN** `POST /auth/refresh` is reviewed in OpenAPI
- **THEN** it SHALL include `403` response with `application/problem+json` for blocked-origin decisions
- **AND** response examples SHALL be aligned with canonical problem type/title/status

#### Scenario: Refresh still supports trusted non-browser mode when configured
- **WHEN** refresh request has no `Origin` header and missing-origin mode is configured to allow trusted calls
- **THEN** contract semantics SHALL preserve normal refresh success/error mappings for token validation paths
