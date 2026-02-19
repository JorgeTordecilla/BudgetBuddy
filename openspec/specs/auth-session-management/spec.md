## ADDED Requirements

### Requirement: User registration
The backend MUST implement `POST /auth/register` with schema validation for `RegisterRequest`, user creation, and `AuthResponse` return semantics.

#### Scenario: Register success
- **WHEN** a valid unique username, password, and currency_code are submitted
- **THEN** the API SHALL return `201` with `AuthResponse` including `user`, `access_token`, `refresh_token`, and `access_token_expires_in`

#### Scenario: Register duplicate username
- **WHEN** the username already exists
- **THEN** the API SHALL return `409` as `ProblemDetails`

### Requirement: User login
The backend MUST implement `POST /auth/login` validating credentials, returning access-token auth payload fields, and issuing refresh state via `bb_refresh` cookie.

#### Scenario: Login success
- **WHEN** valid username and password are submitted
- **THEN** the API SHALL return `200` vendor JSON with `user`, `access_token`, and `access_token_expires_in`, SHALL NOT include `refresh_token` in the body, and SHALL set `bb_refresh` cookie

#### Scenario: Login invalid credentials
- **WHEN** credentials are invalid
- **THEN** the API SHALL return `401` as `ProblemDetails`

### Requirement: Refresh token flow
The backend MUST implement `POST /auth/refresh` with cookie-based refresh-token verification, expiration checks, revocation checks, and token rotation.

#### Scenario: Refresh success
- **WHEN** a valid active refresh token is provided via `bb_refresh` cookie
- **THEN** the API SHALL return `200` with new access-token payload fields and SHALL rotate `bb_refresh` cookie

#### Scenario: Refresh invalid or expired token
- **WHEN** the `bb_refresh` cookie is missing, malformed, unknown, or expired
- **THEN** the API SHALL return `401` as `ProblemDetails`

#### Scenario: Refresh revoked token
- **WHEN** the refresh token represented by `bb_refresh` is revoked or otherwise disallowed
- **THEN** the API SHALL return `403` as `ProblemDetails`

### Requirement: Logout revokes refresh token
The backend MUST implement `POST /auth/logout` to revoke the refresh session represented by `bb_refresh` and expire the cookie deterministically.

#### Scenario: Logout success
- **WHEN** logout is called with a revocable refresh session cookie (and required auth context per endpoint policy)
- **THEN** the API SHALL revoke refresh-token state, return `204`, and set `bb_refresh` with `Max-Age=0`

#### Scenario: Logout without required auth context
- **WHEN** logout request does not include the required auth context (cookie and/or bearer according to endpoint policy)
- **THEN** the API SHALL return `401` as `ProblemDetails`

### Requirement: Refresh cookie attributes are security-hardened
The refresh cookie MUST be emitted with enterprise-safe attributes across login and refresh flows.

#### Scenario: Login emits hardened cookie attributes
- **WHEN** `POST /auth/login` succeeds
- **THEN** emitted `bb_refresh` cookie SHALL include `HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, and `Max-Age=<refresh_ttl_seconds>`

#### Scenario: Refresh rotation preserves hardened cookie attributes
- **WHEN** `POST /auth/refresh` succeeds
- **THEN** rotated `bb_refresh` cookie SHALL include the same hardened attributes as login

### Requirement: Login flow behavior under throttling
The login flow MUST preserve existing credential validation semantics under threshold and return deterministic throttling behavior over threshold.

#### Scenario: Login under threshold remains unchanged
- **WHEN** a client submits valid login requests within configured limits
- **THEN** `POST /auth/login` SHALL behave identically to current auth-session behavior and return standard success/error outcomes

#### Scenario: Login over threshold returns canonical throttle response
- **WHEN** a client exceeds configured login limits within the active window
- **THEN** `POST /auth/login` SHALL return canonical `429` ProblemDetails and SHALL NOT execute normal credential processing path

### Requirement: Refresh flow behavior under throttling
The refresh flow MUST preserve token-rotation semantics under threshold and deterministic throttling over threshold.

#### Scenario: Refresh under threshold preserves rotation behavior
- **WHEN** a valid refresh token request is within configured limits
- **THEN** `POST /auth/refresh` SHALL continue normal token rotation and replay-protection behavior

#### Scenario: Refresh over threshold is throttled before refresh logic
- **WHEN** a client exceeds configured refresh limits within the active window
- **THEN** `POST /auth/refresh` SHALL return canonical `429` ProblemDetails and SHALL NOT advance refresh-token state

### Requirement: Rate limiting is deterministic for testability
Auth throttling behavior MUST support deterministic verification in integration tests.

#### Scenario: Configurable thresholds support deterministic tests
- **WHEN** tests configure low thresholds or controlled windows
- **THEN** throttling outcomes SHALL be deterministic and reproducible without timing flakiness

### Requirement: Auth session security events are auditable
Authentication lifecycle flows MUST emit audit events for logout and refresh-token reuse detection.

#### Scenario: Logout emits audit event
- **WHEN** `POST /auth/logout` succeeds for an authenticated user
- **THEN** the system SHALL persist an audit event linked to `request_id`, `user_id`, and logout action

#### Scenario: Refresh token reuse emits security audit event
- **WHEN** refresh-token reuse is detected in `POST /auth/refresh`
- **THEN** the system SHALL persist an audit event representing the security action without storing token secrets

### Requirement: Auth audit emission does not change session contract semantics
Adding audit writes MUST NOT change existing auth endpoint functional outcomes.

#### Scenario: Auth responses remain contract-compatible with audit enabled
- **WHEN** register/login/refresh/logout are executed under normal conditions
- **THEN** status codes, response schemas, and media types SHALL remain unchanged

### Requirement: Session introspection endpoint for authenticated web bootstrap
Auth session management MUST include a dedicated authenticated `GET /me` endpoint that allows web clients to bootstrap user session state independently of login/refresh timing.

#### Scenario: Bootstrap after app load with valid access token
- **WHEN** a web client calls `GET /me` after startup with a valid access token
- **THEN** the API SHALL return current authenticated user identity data without requiring login or refresh request flow coupling

#### Scenario: Bootstrap fails deterministically without valid access token
- **WHEN** a web client calls `GET /me` without valid access token context
- **THEN** the API SHALL return canonical `401` ProblemDetails and SHALL NOT return partial user data

### Requirement: Session introspection is additive and non-breaking
Adding `GET /me` MUST NOT change existing auth session endpoint semantics.

#### Scenario: Existing auth flows remain unchanged
- **WHEN** register/login/refresh/logout flows execute after introducing `GET /me`
- **THEN** statuses, payload shapes, and cookie/session behaviors for those endpoints SHALL remain unchanged

