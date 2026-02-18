## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Unauthorized responses are canonical
- **WHEN** authentication fails for protected endpoints (including missing/invalid bearer token)
- **THEN** the API SHALL return `401` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/unauthorized`, `title=Unauthorized`, `status=401`

#### Scenario: Forbidden responses are canonical
- **WHEN** an authenticated user is not allowed to access a protected owned resource
- **THEN** the API SHALL return `403` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/forbidden`, `title=Forbidden`, `status=403`

#### Scenario: Not acceptable responses are canonical
- **WHEN** request `Accept` does not include supported media types for contract endpoints
- **THEN** the API SHALL return `406` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/not-acceptable`, `title=Not Acceptable`, `status=406`

### Requirement: Accept header negotiation
The backend MUST validate `Accept` headers for endpoints in the contract and return `406` with `ProblemDetails` when the expected media type is not acceptable.

#### Scenario: Unsupported Accept header
- **WHEN** a client sends `Accept` that does not allow `application/vnd.budgetbuddy.v1+json` or `application/problem+json` as required
- **THEN** the API SHALL return `406` with canonical Not Acceptable ProblemDetails
