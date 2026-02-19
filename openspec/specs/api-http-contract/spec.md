## ADDED Requirements

### Requirement: Vendor media type for successful payloads
The backend MUST return response bodies for successful non-204 operations using `application/vnd.budgetbuddy.v1+json`.

#### Scenario: Successful endpoint response uses vendor media type
- **WHEN** a client calls a successful endpoint that returns a JSON body
- **THEN** the response status SHALL match the OpenAPI status code and the `Content-Type` header SHALL be `application/vnd.budgetbuddy.v1+json`

#### Scenario: Category restore success uses vendor media type
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at` to `null` for a category owned by the authenticated user
- **THEN** the API SHALL return `200` with `Content-Type: application/vnd.budgetbuddy.v1+json` and a `Category` payload with `archived_at=null`

#### Scenario: Transaction restore success uses vendor media type
- **WHEN** `PATCH /transactions/{transaction_id}` sets `archived_at` to `null` for an owned transaction
- **THEN** the API SHALL return `200` with `Content-Type: application/vnd.budgetbuddy.v1+json` and `Transaction` payload

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

### Requirement: Cross-user ownership policy
The backend MUST enforce a single deterministic ownership policy for scoped domain resources.

#### Scenario: Non-owned resources always return forbidden
- **WHEN** an authenticated user accesses another user's account, category, or transaction using `GET`, `PATCH`, or `DELETE`
- **THEN** the API SHALL return `403` with canonical forbidden ProblemDetails (`type/title/status`) and SHALL NOT switch to `404`

### Requirement: Accept header negotiation
The backend MUST validate `Accept` headers for endpoints in the contract and return `406` with `ProblemDetails` when the expected media type is not acceptable.

#### Scenario: Unsupported Accept header
- **WHEN** a client sends `Accept` that does not allow `application/vnd.budgetbuddy.v1+json` or `application/problem+json` as required
- **THEN** the API SHALL return `406` with canonical Not Acceptable ProblemDetails

#### Scenario: Category restore with unsupported Accept header
- **WHEN** a client calls `PATCH /categories/{category_id}` with `archived_at: null` and sends an unsupported `Accept` header
- **THEN** the API SHALL return `406` with `application/problem+json`

### Requirement: OpenAPI response mapping for transaction conflicts
Transaction write endpoints MUST expose conflict responses in OpenAPI with `application/problem+json`.

#### Scenario: OpenAPI includes category archived conflict on transaction create and patch
- **WHEN** contract files are reviewed for `POST /transactions` and `PATCH /transactions/{transaction_id}`
- **THEN** both endpoints SHALL include `409` response mapping with `application/problem+json`

### Requirement: OpenAPI response mapping for paginated list errors
Paginated list endpoints MUST document invalid cursor errors with `application/problem+json`.

#### Scenario: OpenAPI includes invalid cursor conflict for list endpoints
- **WHEN** contract files are reviewed for `GET /accounts`, `GET /categories`, and `GET /transactions`
- **THEN** each endpoint SHALL include `400` response mapping with `application/problem+json` for invalid cursor cases

### Requirement: Refresh token rotation and replay protection
The backend MUST rotate refresh tokens on successful refresh and block reuse deterministically.

#### Scenario: Refresh rotates and invalidates previous token
- **WHEN** `POST /auth/refresh` succeeds
- **THEN** response SHALL include a new `refresh_token` and the previous refresh token SHALL become unusable immediately

#### Scenario: Refresh reuse is forbidden with canonical problem
- **WHEN** a previously used (rotated) or revoked refresh token is presented to `POST /auth/refresh`
- **THEN** the API SHALL return `403` `application/problem+json` with canonical `type=https://api.budgetbuddy.dev/problems/refresh-revoked`

### Requirement: Transaction restore idempotency
Transaction restore through patch MUST be idempotent.

#### Scenario: Restore archived transaction
- **WHEN** transaction is archived and client sends `PATCH /transactions/{transaction_id}` with `archived_at=null`
- **THEN** `archived_at` SHALL become `null` and response SHALL be `200`

#### Scenario: Restore already-active transaction
- **WHEN** transaction already has `archived_at=null` and client sends same restore patch
- **THEN** API SHALL return `200` with unchanged active state

### Requirement: 204 responses have no response body
The backend MUST return empty bodies for `204 No Content` responses.

#### Scenario: Logout or archive returns no payload
- **WHEN** `/auth/logout` or an archive endpoint succeeds with `204`
- **THEN** the response SHALL contain no body and SHALL not include a JSON payload


