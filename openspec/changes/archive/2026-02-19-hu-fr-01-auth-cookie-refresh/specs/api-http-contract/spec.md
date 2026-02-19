## MODIFIED Requirements

### Requirement: Refresh token rotation and replay protection
The backend MUST rotate refresh tokens on successful refresh and block reuse deterministically using cookie-based refresh transport.

#### Scenario: Refresh rotates cookie and invalidates previous token
- **WHEN** `POST /auth/refresh` succeeds using a valid `bb_refresh` cookie
- **THEN** response SHALL return `200` with vendor JSON payload that excludes `refresh_token`, SHALL emit `Set-Cookie` for rotated `bb_refresh`, and the previous refresh token SHALL become unusable immediately

#### Scenario: Refresh reuse is forbidden with canonical problem
- **WHEN** a previously used (rotated) or revoked refresh token is presented through `bb_refresh` in `POST /auth/refresh`
- **THEN** the API SHALL return `403` `application/problem+json` with canonical `type=https://api.budgetbuddy.dev/problems/refresh-reuse-detected`

### Requirement: 204 responses have no response body
The backend MUST return empty bodies for `204 No Content` responses while allowing response headers required for cookie lifecycle control.

#### Scenario: Logout returns no payload and expires refresh cookie
- **WHEN** `/auth/logout` succeeds with `204`
- **THEN** the response SHALL contain no body and SHALL include `Set-Cookie` expiring `bb_refresh` with `Max-Age=0`

## ADDED Requirements

### Requirement: Auth cookie transport is explicit in OpenAPI
The OpenAPI contract MUST explicitly document refresh-cookie transport and response headers for auth endpoints.

#### Scenario: Login and refresh document Set-Cookie header
- **WHEN** `POST /auth/login` and `POST /auth/refresh` are reviewed in `backend/openapi.yaml`
- **THEN** each operation SHALL define a `Set-Cookie` response header describing `bb_refresh` attributes (`HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, `Max-Age=<refresh_ttl_seconds>`)

#### Scenario: Refresh request body is not required by contract
- **WHEN** `POST /auth/refresh` request schema is reviewed
- **THEN** the operation SHALL require refresh authentication via cookie and SHALL NOT require a JSON request body

### Requirement: Auth success payload excludes refresh token
Auth success payloads for login and refresh MUST exclude `refresh_token` from response JSON.

#### Scenario: Login success schema excludes refresh token
- **WHEN** `POST /auth/login` returns `200`
- **THEN** response schema SHALL include `user`, `access_token`, and `access_token_expires_in`, and SHALL NOT include `refresh_token`

#### Scenario: Refresh success schema excludes refresh token
- **WHEN** `POST /auth/refresh` returns `200`
- **THEN** response schema SHALL include `user`, `access_token`, and `access_token_expires_in`, and SHALL NOT include `refresh_token`
