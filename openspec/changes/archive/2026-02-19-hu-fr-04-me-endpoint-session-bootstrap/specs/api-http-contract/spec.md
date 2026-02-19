## ADDED Requirements

### Requirement: Session bootstrap endpoint returns authenticated user profile
The HTTP contract MUST expose `GET /me` as an authenticated endpoint that returns the current user profile using existing `User` schema and vendor media type.

#### Scenario: Authenticated request returns current user
- **WHEN** `GET /me` is called with a valid bearer access token
- **THEN** the API SHALL return `200` with `Content-Type: application/vnd.budgetbuddy.v1+json` and a `User` payload

### Requirement: Session bootstrap endpoint error mappings are canonical
The `GET /me` contract MUST define canonical error mappings using `application/problem+json`.

#### Scenario: Missing or invalid token returns canonical unauthorized
- **WHEN** `GET /me` is called without a valid bearer token
- **THEN** the API SHALL return `401` with canonical unauthorized ProblemDetails (`type`, `title`, `status`)

#### Scenario: Unsupported Accept returns canonical not acceptable
- **WHEN** `GET /me` is called with unsupported `Accept`
- **THEN** the API SHALL return `406` with canonical not-acceptable ProblemDetails

### Requirement: Session bootstrap endpoint exposes request correlation header
The `GET /me` contract MUST include request correlation header behavior consistent with operational conventions.

#### Scenario: Response includes X-Request-Id header
- **WHEN** `GET /me` responds (success or canonical error)
- **THEN** the response SHALL include `X-Request-Id` according to existing request-id propagation/generation behavior
