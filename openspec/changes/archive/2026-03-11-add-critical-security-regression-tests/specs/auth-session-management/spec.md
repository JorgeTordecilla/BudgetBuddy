## MODIFIED Requirements

### Requirement: Expired or invalid auth artifacts are unauthorized
The backend MUST treat expired or invalid session artifacts as unauthorized rather than as internal server errors.

#### Scenario: Expired refresh token returns canonical unauthorized response
- **WHEN** an expired refresh token is presented to the refresh flow
- **THEN** the API SHALL return canonical `401` `application/problem+json`
- **AND** the request SHALL NOT fail with `500`

#### Scenario: Expired bearer access token returns canonical unauthorized response
- **WHEN** an expired bearer access token is presented to a protected endpoint such as `GET /me`
- **THEN** the API SHALL return canonical `401` `application/problem+json`
- **AND** the request SHALL NOT fail with `500`
