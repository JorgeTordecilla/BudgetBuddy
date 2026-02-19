## ADDED Requirements

### Requirement: Auth endpoints expose explicit 429 mappings
The OpenAPI contract MUST document `429 Too Many Requests` responses for `POST /auth/login` and `POST /auth/refresh`.

#### Scenario: Login operation documents 429 ProblemDetails
- **WHEN** `backend/openapi.yaml` is reviewed for `POST /auth/login`
- **THEN** the operation SHALL include a `429` response with `application/problem+json` mapped to `ProblemDetails`

#### Scenario: Refresh operation documents 429 ProblemDetails
- **WHEN** `backend/openapi.yaml` is reviewed for `POST /auth/refresh`
- **THEN** the operation SHALL include a `429` response with `application/problem+json` mapped to `ProblemDetails`

### Requirement: Retry guidance contract for throttled auth responses
The HTTP contract MUST define deterministic retry guidance for throttled auth responses.

#### Scenario: Retry-After behavior is documented
- **WHEN** auth endpoints return `429`
- **THEN** the contract SHALL define `Retry-After` behavior and format expectations for clients

#### Scenario: Existing auth success contract is unchanged under limit
- **WHEN** requests remain within configured thresholds
- **THEN** auth endpoint success statuses and payload media type SHALL remain unchanged from existing contract behavior
