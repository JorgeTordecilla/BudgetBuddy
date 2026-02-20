## ADDED Requirements

### Requirement: Register success payload matches auth session shape
The HTTP contract MUST define `POST /auth/register` success body using `AuthSessionResponse` semantics and MUST NOT expose `refresh_token` in JSON.

#### Scenario: Register success excludes refresh token from body
- **WHEN** `POST /auth/register` succeeds
- **THEN** the API SHALL return `201` with `Content-Type: application/vnd.budgetbuddy.v1+json` and payload fields `user`, `access_token`, `access_token_expires_in` only

### Requirement: Register contract documents refresh cookie transport
The OpenAPI contract MUST explicitly document `Set-Cookie` refresh transport for register success.

#### Scenario: Register success includes Set-Cookie header mapping
- **WHEN** `POST /auth/register` success response is reviewed in OpenAPI
- **THEN** it SHALL define `Set-Cookie` header semantics for `bb_refresh` cookie attributes consistent with login/refresh

### Requirement: Register examples are aligned with cookie-only refresh model
Register success examples MUST not include `refresh_token` in JSON body.

#### Scenario: Register success examples exclude refresh token
- **WHEN** OpenAPI examples for `POST /auth/register` are reviewed
- **THEN** success examples SHALL omit `refresh_token` and remain schema-valid under `AuthSessionResponse`
