## ADDED Requirements

### Requirement: CORS response behavior is explicit for credentialed browser clients
The HTTP contract MUST define credentialed CORS behavior required for cross-site cookie-based auth flows.

#### Scenario: Actual request from allowed origin includes credential headers
- **WHEN** an allowed frontend origin calls an API endpoint with `Origin` header
- **THEN** the response SHALL include `Access-Control-Allow-Origin` equal to that origin and `Access-Control-Allow-Credentials: true`

### Requirement: Preflight behavior is contractually stable for auth cookie routes
The HTTP contract MUST guarantee valid CORS preflight behavior for auth endpoints used by browser refresh flows.

#### Scenario: Auth refresh preflight returns valid CORS metadata
- **WHEN** `OPTIONS /api/auth/refresh` is requested by an allowed origin with requested method/headers
- **THEN** the API SHALL return a successful preflight response with CORS allow-origin, allow-credentials, allow-methods, and allow-headers metadata

### Requirement: CORS operational header visibility is documented
The HTTP contract MUST expose which headers are readable by browser clients in cross-site mode.

#### Scenario: Exposed headers are listed for frontend integrations
- **WHEN** contract documentation is reviewed for cross-site usage
- **THEN** it SHALL specify that `X-Request-Id` and `Retry-After` are exposed via CORS for frontend consumption
