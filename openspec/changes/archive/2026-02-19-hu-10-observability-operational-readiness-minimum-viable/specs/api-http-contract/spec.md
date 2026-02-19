## ADDED Requirements

### Requirement: Request correlation header is present on every response
The API SHALL include `X-Request-Id` on all responses, including success and error responses.

#### Scenario: Request-id is generated when absent
- **WHEN** a client calls any API endpoint without `X-Request-Id`
- **THEN** the backend SHALL generate a request id and include `X-Request-Id` in the response

#### Scenario: Request-id is propagated when provided
- **WHEN** a client sends `X-Request-Id` in the request
- **THEN** the backend SHALL return the same `X-Request-Id` value in the response

#### Scenario: Error responses include request-id
- **WHEN** an endpoint returns an error (for example `401` or `406`)
- **THEN** the response SHALL include `X-Request-Id` and keep error body media type `application/problem+json`

### Requirement: OpenAPI documents request-id operational header
The contract SHALL document `X-Request-Id` as an operational response header for API endpoints.

#### Scenario: OpenAPI documents request-id behavior
- **WHEN** OpenAPI files are reviewed
- **THEN** `X-Request-Id` SHALL be described as generated if missing and propagated if provided
