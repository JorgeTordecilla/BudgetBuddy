## ADDED Requirements

### Requirement: API responses include baseline security headers
The HTTP contract MUST define baseline security headers for API responses.

#### Scenario: Security headers are present on successful API responses
- **WHEN** a client receives a successful API response
- **THEN** the response SHALL include `X-Content-Type-Options: nosniff`
- **AND** the response SHALL include `Referrer-Policy`
- **AND** the response SHALL include `Cross-Origin-Opener-Policy` when enabled by policy
- **AND** the response SHALL include baseline `Content-Security-Policy` for API usage

#### Scenario: Security headers are present on canonical error responses
- **WHEN** a client receives an `application/problem+json` response
- **THEN** the response SHALL include the same baseline security headers as successful responses

### Requirement: CORS exposed headers remain minimal and explicit
The HTTP contract MUST keep browser-readable response headers limited to required operational values.

#### Scenario: Exposed headers are explicitly constrained
- **WHEN** CORS behavior is documented and validated
- **THEN** exposed headers SHALL be limited to `X-Request-Id` and `Retry-After`

#### Scenario: Credentialed CORS behavior remains explicit
- **WHEN** allowed origins perform cross-site requests with credentials
- **THEN** responses SHALL include `Access-Control-Allow-Credentials: true`
