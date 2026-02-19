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

#### Scenario: Catalog values are exact and stable
- **WHEN** canonical ProblemDetails are emitted for `400/401/403/406/409`
- **THEN** runtime responses SHALL use exact `type`, `title`, and `status` values documented in the contract catalog

### Requirement: Cross-user ownership policy
The backend MUST enforce a single deterministic ownership policy for scoped domain resources.

#### Scenario: Non-owned resources always return forbidden
- **WHEN** an authenticated user accesses another user's account, category, or transaction using `GET`, `PATCH`, or `DELETE`
- **THEN** the API SHALL return `403` with canonical forbidden ProblemDetails (`type/title/status`) and SHALL NOT switch to `404`

#### Scenario: OpenAPI ownership wording is normalized
- **WHEN** OpenAPI is reviewed for ownership violations on domain endpoints
- **THEN** `403` descriptions SHALL use the canonical wording `Forbidden (resource is not owned by authenticated user)`

### Requirement: OpenAPI response mapping for paginated list errors
Paginated list endpoints MUST document invalid cursor errors with `application/problem+json`.

#### Scenario: OpenAPI includes invalid cursor conflict for list endpoints
- **WHEN** contract files are reviewed for `GET /accounts`, `GET /categories`, and `GET /transactions`
- **THEN** each endpoint SHALL include `400` response mapping with `application/problem+json` for invalid cursor cases

#### Scenario: Invalid cursor descriptions are normalized
- **WHEN** OpenAPI is reviewed for paginated list endpoints
- **THEN** invalid cursor `400` descriptions SHALL be consistent and use canonical invalid cursor language

### Requirement: Accept header negotiation
The backend MUST validate `Accept` headers for endpoints in the contract and return `406` with `ProblemDetails` when the expected media type is not acceptable.

#### Scenario: Unsupported Accept header
- **WHEN** a client sends `Accept` that does not allow `application/vnd.budgetbuddy.v1+json` or `application/problem+json` as required
- **THEN** the API SHALL return `406` with canonical Not Acceptable ProblemDetails

#### Scenario: OpenAPI not acceptable descriptions are normalized
- **WHEN** OpenAPI is reviewed for endpoints that negotiate media types
- **THEN** `406` descriptions SHALL use canonical Not Acceptable wording consistently
