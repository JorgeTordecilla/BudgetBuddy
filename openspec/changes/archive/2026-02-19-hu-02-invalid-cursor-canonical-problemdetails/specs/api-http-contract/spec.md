## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Invalid cursor is canonical
- **WHEN** `cursor` query parameter is malformed (invalid base64, invalid JSON, or missing required cursor keys)
- **THEN** the API SHALL return `400` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/invalid-cursor`, `title=Invalid cursor`, `status=400`

### Requirement: Vendor media type for successful payloads
The backend MUST return response bodies for successful non-204 operations using `application/vnd.budgetbuddy.v1+json`.

#### Scenario: Successful endpoint response uses vendor media type
- **WHEN** a client calls a successful endpoint that returns a JSON body
- **THEN** the response status SHALL match the OpenAPI status code and the `Content-Type` header SHALL be `application/vnd.budgetbuddy.v1+json`

### Requirement: OpenAPI response mapping for paginated list errors
Paginated list endpoints MUST document invalid cursor errors with `application/problem+json`.

#### Scenario: OpenAPI includes invalid cursor conflict for list endpoints
- **WHEN** contract files are reviewed for `GET /accounts`, `GET /categories`, and `GET /transactions`
- **THEN** each endpoint SHALL include `400` response mapping with `application/problem+json` for invalid cursor cases
