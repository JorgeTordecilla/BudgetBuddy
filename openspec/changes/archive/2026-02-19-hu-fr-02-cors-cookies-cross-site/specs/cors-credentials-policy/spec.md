## ADDED Requirements

### Requirement: CORS origins are explicit and environment-driven
The backend MUST load CORS origins from configuration and apply an explicit allowlist suitable for credentialed cross-site requests.

#### Scenario: Development origin is allowed by default
- **WHEN** no explicit production origin list is provided
- **THEN** the backend SHALL allow `http://localhost:5173` for local frontend development against `http://localhost:8000`

#### Scenario: Production origins are parsed from environment
- **WHEN** `BUDGETBUDDY_CORS_ORIGINS` is configured with a comma-separated list
- **THEN** the backend SHALL parse and apply each non-empty origin entry deterministically

### Requirement: Credentialed CORS policy is enforced
The backend MUST enforce a credentialed CORS policy compatible with HttpOnly refresh cookies.

#### Scenario: Credentials are enabled for allowed origins
- **WHEN** a request includes an allowed `Origin`
- **THEN** the backend SHALL return `Access-Control-Allow-Credentials: true` and an explicit matching `Access-Control-Allow-Origin` value

#### Scenario: Wildcard origin is not used with credentials
- **WHEN** credentialed CORS policy is active
- **THEN** the backend SHALL NOT emit `Access-Control-Allow-Origin: *`

### Requirement: Allowed methods and headers are deterministic
The backend MUST expose a fixed CORS allow-method and allow-header set for browser preflight checks.

#### Scenario: Allowed methods include cross-site auth and domain operations
- **WHEN** a CORS preflight request is evaluated
- **THEN** `Access-Control-Allow-Methods` SHALL cover `GET`, `POST`, `PATCH`, `DELETE`, and `OPTIONS`

#### Scenario: Allowed headers include auth and tracing headers
- **WHEN** a CORS preflight request is evaluated
- **THEN** `Access-Control-Allow-Headers` SHALL include `Authorization`, `Content-Type`, `Accept`, and `X-Request-Id`

### Requirement: Operational response headers are exposed to browsers
The backend MUST expose selected response headers required by frontend observability and retry handling.

#### Scenario: Exposed headers include request tracing and retry metadata
- **WHEN** a response is returned to an allowed cross-site origin
- **THEN** `Access-Control-Expose-Headers` SHALL include `X-Request-Id` and `Retry-After`

### Requirement: Preflight responses are valid for credentialed auth routes
Auth route preflight requests MUST return successful CORS responses with required headers.

#### Scenario: Refresh preflight succeeds with CORS headers
- **WHEN** `OPTIONS /api/auth/refresh` is called with allowed origin and request metadata
- **THEN** the response SHALL return `200` or `204` and include the configured CORS allow-origin and allow-credentials headers
