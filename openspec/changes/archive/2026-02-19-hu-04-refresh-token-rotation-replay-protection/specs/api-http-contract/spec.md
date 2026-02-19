## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Refresh revoked/reuse is canonical forbidden
- **WHEN** `POST /auth/refresh` receives a refresh token that was revoked or already rotated/used
- **THEN** the API SHALL return `403` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/refresh-revoked`, `status=403`

#### Scenario: Refresh invalid/expired is unauthorized
- **WHEN** `POST /auth/refresh` receives malformed, expired, or signature-invalid refresh token
- **THEN** the API SHALL return `401` with canonical unauthorized ProblemDetails

### Requirement: Authentication refresh contract
`POST /auth/refresh` MUST enforce refresh token rotation and replay protection.

#### Scenario: Refresh token is rotated on success
- **WHEN** a valid active refresh token is sent to `POST /auth/refresh`
- **THEN** the API SHALL return `200` with a new `access_token` and new `refresh_token`, and invalidate the previous refresh token immediately

#### Scenario: Reuse detection blocks second use
- **WHEN** a client calls `POST /auth/refresh` twice with the same refresh token
- **THEN** the first call SHALL succeed with `200` and the second call SHALL fail with canonical `403` refresh-revoked ProblemDetails

### Requirement: OpenAPI response mapping for refresh
OpenAPI MUST document refresh rotation/replay responses with exact status/media mappings.

#### Scenario: Refresh endpoint includes 401 and 403 mappings
- **WHEN** contract files are reviewed for `POST /auth/refresh`
- **THEN** the endpoint SHALL include `401` and `403` response mappings using `application/problem+json`
