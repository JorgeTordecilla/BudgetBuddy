## ADDED Requirements

### Requirement: Vendor media type for successful payloads
The backend MUST return response bodies for successful non-204 operations using `application/vnd.budgetbuddy.v1+json`.

#### Scenario: Successful endpoint response uses vendor media type
- **WHEN** a client calls a successful endpoint that returns a JSON body
- **THEN** the response status SHALL match the OpenAPI status code and the `Content-Type` header SHALL be `application/vnd.budgetbuddy.v1+json`

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Archived account conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` references an account whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, and `status=409`

### Requirement: Accept header negotiation
The backend MUST validate `Accept` headers for endpoints in the contract and return `406` with `ProblemDetails` when the expected media type is not acceptable.

#### Scenario: Unsupported Accept header
- **WHEN** a client sends `Accept` that does not allow `application/vnd.budgetbuddy.v1+json` or `application/problem+json` as required
- **THEN** the API SHALL return `406` with `application/problem+json`

### Requirement: 204 responses have no response body
The backend MUST return empty bodies for `204 No Content` responses.

#### Scenario: Logout or archive returns no payload
- **WHEN** `/auth/logout` or an archive endpoint succeeds with `204`
- **THEN** the response SHALL contain no body and SHALL not include a JSON payload
