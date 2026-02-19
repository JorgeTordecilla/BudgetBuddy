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
The backend MUST implement `POST /auth/login` validating credentials and returning `AuthResponse` on success.

#### Scenario: Login success
- **WHEN** valid username and password are submitted
- **THEN** the API SHALL return `200` with `AuthResponse`

#### Scenario: Login invalid credentials
- **WHEN** credentials are invalid
- **THEN** the API SHALL return `401` as `ProblemDetails`

### Requirement: Refresh token flow
The backend MUST implement `POST /auth/refresh` with refresh token verification, expiration checks, and revocation checks.

#### Scenario: Refresh success
- **WHEN** a valid active refresh token is provided
- **THEN** the API SHALL return `200` with a new valid `AuthResponse`

#### Scenario: Refresh invalid or expired token
- **WHEN** the refresh token is malformed, unknown, or expired
- **THEN** the API SHALL return `401` as `ProblemDetails`

#### Scenario: Refresh revoked token
- **WHEN** the refresh token is revoked or otherwise disallowed
- **THEN** the API SHALL return `403` as `ProblemDetails`

### Requirement: Logout revokes refresh token
The backend MUST implement `POST /auth/logout` to revoke the provided refresh token while requiring valid access authentication.

#### Scenario: Logout success
- **WHEN** a valid access token and revocable refresh token are provided
- **THEN** the API SHALL revoke the refresh token and return `204`

#### Scenario: Logout with invalid access token
- **WHEN** the access token is invalid or expired
- **THEN** the API SHALL return `401` as `ProblemDetails`

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

