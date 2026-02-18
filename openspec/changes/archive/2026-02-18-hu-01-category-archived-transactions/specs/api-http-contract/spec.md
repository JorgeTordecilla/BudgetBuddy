## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Archived account conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` references an account whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, and `status=409`

#### Scenario: Category archived conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` resolves to a category whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/category-archived`, `title=Category is archived`, and `status=409`

### Requirement: Vendor media type for successful payloads
The backend MUST return response bodies for successful non-204 operations using `application/vnd.budgetbuddy.v1+json`.

#### Scenario: Successful endpoint response uses vendor media type
- **WHEN** a client calls a successful endpoint that returns a JSON body
- **THEN** the response status SHALL match the OpenAPI status code and the `Content-Type` header SHALL be `application/vnd.budgetbuddy.v1+json`

### Requirement: OpenAPI response mapping for transaction conflicts
Transaction write endpoints MUST expose conflict responses in OpenAPI with `application/problem+json`.

#### Scenario: OpenAPI includes category archived conflict on transaction create and patch
- **WHEN** contract files are reviewed for `POST /transactions` and `PATCH /transactions/{transaction_id}`
- **THEN** both endpoints SHALL include `409` response mapping with `application/problem+json`
