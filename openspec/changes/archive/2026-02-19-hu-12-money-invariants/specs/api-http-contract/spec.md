## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Validation error is returned as ProblemDetails
- **WHEN** request data violates schema constraints
- **THEN** the API SHALL return status `400` with `Content-Type: application/problem+json` and a body containing `type`, `title`, and `status`

#### Scenario: Invalid cursor is canonical
- **WHEN** `cursor` query parameter is malformed (invalid base64, invalid JSON, or missing required cursor keys)
- **THEN** the API SHALL return `400` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/invalid-cursor`, `title=Invalid cursor`, `status=400`

#### Scenario: Unauthorized responses are canonical
- **WHEN** authentication fails for protected endpoints (including missing/invalid bearer token)
- **THEN** the API SHALL return `401` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/unauthorized`, `title=Unauthorized`, `status=401`

#### Scenario: Forbidden responses are canonical
- **WHEN** an authenticated user is not allowed to access a protected owned resource
- **THEN** the API SHALL return `403` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/forbidden`, `title=Forbidden`, `status=403`

#### Scenario: Not acceptable responses are canonical
- **WHEN** request `Accept` does not include supported media types for contract endpoints
- **THEN** the API SHALL return `406` with `application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/not-acceptable`, `title=Not Acceptable`, `status=406`

#### Scenario: Archived account conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` references an account whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, and `status=409`

#### Scenario: Category archived conflict has canonical ProblemDetails
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` resolves to a category whose `archived_at` is not null
- **THEN** the API SHALL return `409` with `application/problem+json` and `type=https://api.budgetbuddy.dev/problems/category-archived`, `title=Category is archived`, and `status=409`

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

#### Scenario: Transaction restore without token is unauthorized
- **WHEN** `PATCH /transactions/{transaction_id}` with `archived_at=null` is called without valid bearer token
- **THEN** the API SHALL return canonical `401` ProblemDetails

#### Scenario: Transaction restore for non-owner is forbidden
- **WHEN** `PATCH /transactions/{transaction_id}` with `archived_at=null` targets another user's transaction
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Transaction restore with unsupported accept is not acceptable
- **WHEN** `PATCH /transactions/{transaction_id}` with `archived_at=null` is called with unsupported `Accept`
- **THEN** the API SHALL return canonical `406` ProblemDetails

#### Scenario: Catalog values are exact and stable
- **WHEN** canonical ProblemDetails are emitted for `400/401/403/406/409`
- **THEN** runtime responses SHALL use exact `type`, `title`, and `status` values documented in the contract catalog

#### Scenario: Money validation failures are canonical 400 responses
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` fails money invariants (`amount_cents` non-integer, zero/sign-invalid, out-of-range, currency mismatch)
- **THEN** the API SHALL return `400` with `Content-Type: application/problem+json` and canonical `ProblemDetails` fields

#### Scenario: Money validation failures do not leak internals
- **WHEN** money-validation errors are returned to clients
- **THEN** response payloads SHALL NOT include stack traces, ORM internals, or validator implementation details
