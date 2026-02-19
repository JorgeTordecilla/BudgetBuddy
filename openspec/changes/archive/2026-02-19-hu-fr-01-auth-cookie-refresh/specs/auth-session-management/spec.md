## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Refresh cookie attributes are security-hardened
The refresh cookie MUST be emitted with enterprise-safe attributes across login and refresh flows.

#### Scenario: Login emits hardened cookie attributes
- **WHEN** `POST /auth/login` succeeds
- **THEN** emitted `bb_refresh` cookie SHALL include `HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, and `Max-Age=<refresh_ttl_seconds>`

#### Scenario: Refresh rotation preserves hardened cookie attributes
- **WHEN** `POST /auth/refresh` succeeds
- **THEN** rotated `bb_refresh` cookie SHALL include the same hardened attributes as login
