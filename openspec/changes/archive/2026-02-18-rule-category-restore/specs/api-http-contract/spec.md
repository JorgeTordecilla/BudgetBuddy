## MODIFIED Requirements

### Requirement: Vendor media type for successful payloads
The backend MUST return response bodies for successful non-204 operations using `application/vnd.budgetbuddy.v1+json`.

#### Scenario: Successful endpoint response uses vendor media type
- **WHEN** a client calls a successful endpoint that returns a JSON body
- **THEN** the response status SHALL match the OpenAPI status code and the `Content-Type` header SHALL be `application/vnd.budgetbuddy.v1+json`

#### Scenario: Category restore success uses vendor media type
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at` to `null` for a category owned by the authenticated user
- **THEN** the API SHALL return `200` with `Content-Type: application/vnd.budgetbuddy.v1+json` and a `Category` payload with `archived_at=null`

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Archived account conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` references an account whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, and `status=409`

#### Scenario: Category type mismatch conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` has `type` different from the selected category `type`
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/category-type-mismatch`, `title=Category type mismatch`, and `status=409`

#### Scenario: Category mismatch canonical problem is consistent for both mismatch directions
- **WHEN** mismatch occurs for `income->expense` or `expense->income`
- **THEN** the API SHALL return the same canonical ProblemDetails fields (`type`, `title`, `status`) in both cases

#### Scenario: Category restore without token returns ProblemDetails
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at` to `null` without a valid access token
- **THEN** the API SHALL return `401` with `application/problem+json` and required `ProblemDetails` fields

#### Scenario: Category restore on other user's category returns ProblemDetails
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at` to `null` for a category not owned by the authenticated user
- **THEN** the API SHALL return `403` with `application/problem+json` and required `ProblemDetails` fields

### Requirement: Accept header negotiation
The backend MUST validate `Accept` headers for endpoints in the contract and return `406` with `ProblemDetails` when the expected media type is not acceptable.

#### Scenario: Unsupported Accept header
- **WHEN** a client sends `Accept` that does not allow `application/vnd.budgetbuddy.v1+json` or `application/problem+json` as required
- **THEN** the API SHALL return `406` with `application/problem+json`

#### Scenario: Category restore with unsupported Accept header
- **WHEN** a client calls `PATCH /categories/{category_id}` with `archived_at: null` and sends an unsupported `Accept` header
- **THEN** the API SHALL return `406` with `application/problem+json`
