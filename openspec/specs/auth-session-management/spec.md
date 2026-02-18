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
