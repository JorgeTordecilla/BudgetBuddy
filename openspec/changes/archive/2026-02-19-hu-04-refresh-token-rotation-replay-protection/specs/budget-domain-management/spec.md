## MODIFIED Requirements

### Requirement: Authentication lifecycle behavior
The backend MUST implement register/login/refresh/logout behavior aligned to OpenAPI and secure session management.

#### Scenario: Refresh token replay is rejected
- **WHEN** a previously rotated refresh token is reused
- **THEN** the API SHALL reject with canonical `403` refresh-revoked ProblemDetails

#### Scenario: Refresh token invalid or expired is rejected
- **WHEN** refresh token is malformed, signature-invalid, or expired
- **THEN** the API SHALL reject with canonical `401` ProblemDetails

#### Scenario: Logout revokes active refresh token(s)
- **WHEN** a user calls logout with active session refresh token(s)
- **THEN** those refresh token(s) SHALL be marked revoked and cannot be used again in `POST /auth/refresh`

#### Scenario: Refresh token storage is hashed
- **WHEN** refresh token state is persisted
- **THEN** token values SHALL be stored hashed and resolved via indexed lookup path
