## MODIFIED Requirements

### Requirement: The OpenAPI contract MUST document `429 Too Many Requests` responses for auth endpoints
The OpenAPI contract MUST document canonical `429 Too Many Requests` behavior for throttled auth endpoints.

#### Scenario: Register operation documents 429 ProblemDetails
- **WHEN** `backend/openapi.yaml` is reviewed for `POST /auth/register`
- **THEN** it SHALL define a `429` response with `application/problem+json`

#### Scenario: Register operation documents Retry-After header
- **WHEN** `backend/openapi.yaml` is reviewed for throttled `POST /auth/register`
- **THEN** the `429` response SHALL document `Retry-After`

#### Scenario: Register operation documents request-id header on throttled response
- **WHEN** `backend/openapi.yaml` is reviewed for throttled `POST /auth/register`
- **THEN** the `429` response SHALL document `X-Request-Id`

### Requirement: The HTTP contract MUST keep auth endpoint throttling behavior aligned across runtime and spec
The OpenAPI contract MUST keep auth throttling semantics aligned with backend runtime behavior for register, login, and refresh endpoints.

#### Scenario: Register throttling is described as IP-based abuse protection
- **WHEN** auth throttling behavior is described for `POST /auth/register`
- **THEN** the contract text SHALL state that throttling is based on backend rate-limit identity rules consistent with trusted client IP resolution

#### Scenario: Refresh throttling identity is not token-value based
- **WHEN** auth throttling behavior is described for `POST /auth/refresh`
- **THEN** the contract text SHALL NOT imply that arbitrary refresh token value variation creates separate limiter buckets

### Requirement: Auth response mappings remain additive under throttling expansion
Adding throttling to register MUST NOT alter auth success payload schemas or media-type conventions.

#### Scenario: Register success contract remains unchanged
- **WHEN** `POST /auth/register` success responses are reviewed after throttling support is added
- **THEN** the operation SHALL still document vendor success JSON for `201`
- **AND** throttling support SHALL be additive through `429` response mappings only
