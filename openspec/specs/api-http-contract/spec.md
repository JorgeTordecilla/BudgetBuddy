## Purpose
Define the canonical HTTP/API contract for BudgetBuddy, including media types, error semantics, and endpoint behavior guarantees.
## Requirements
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

#### Scenario: Catalog values are exact and stable
- **WHEN** canonical ProblemDetails are emitted for `400/401/403/406/409`
- **THEN** runtime responses SHALL use exact `type`, `title`, and `status` values documented in the contract catalog

#### Scenario: Money validation failures are canonical 400 responses
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` fails money invariants (`amount_cents` non-integer, zero/sign-invalid, out-of-range, currency mismatch)
- **THEN** the API SHALL return `400` with `Content-Type: application/problem+json` and canonical `ProblemDetails` fields

#### Scenario: Money validation failures do not leak internals
- **WHEN** money-validation errors are returned to clients
- **THEN** response payloads SHALL NOT include stack traces, ORM internals, or validator implementation details

### Requirement: Cross-user ownership policy
The backend MUST enforce a single deterministic ownership policy for scoped domain resources.

#### Scenario: Non-owned resources always return forbidden
- **WHEN** an authenticated user accesses another user's account, category, or transaction using `GET`, `PATCH`, or `DELETE`
- **THEN** the API SHALL return `403` with canonical forbidden ProblemDetails (`type/title/status`) and SHALL NOT switch to `404`

#### Scenario: OpenAPI ownership wording is normalized
- **WHEN** OpenAPI is reviewed for ownership violations on domain endpoints
- **THEN** `403` descriptions SHALL use the canonical wording `Forbidden (resource is not owned by authenticated user)`

### Requirement: Accept header negotiation
The backend MUST validate `Accept` headers for endpoints in the contract and return `406` with `ProblemDetails` when the expected media type is not acceptable.

#### Scenario: Unsupported Accept header
- **WHEN** a client sends `Accept` that does not allow `application/vnd.budgetbuddy.v1+json` or `application/problem+json` as required
- **THEN** the API SHALL return `406` with canonical Not Acceptable ProblemDetails

#### Scenario: Category restore with unsupported Accept header
- **WHEN** a client calls `PATCH /categories/{category_id}` with `archived_at: null` and sends an unsupported `Accept` header
- **THEN** the API SHALL return `406` with `application/problem+json`

#### Scenario: OpenAPI not acceptable descriptions are normalized
- **WHEN** OpenAPI is reviewed for endpoints that negotiate media types
- **THEN** `406` descriptions SHALL use canonical Not Acceptable wording consistently

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

#### Scenario: Invalid cursor descriptions are normalized
- **WHEN** OpenAPI is reviewed for paginated list endpoints
- **THEN** invalid cursor `400` descriptions SHALL be consistent and use canonical invalid cursor language

### Requirement: Refresh token rotation and replay protection
The backend MUST rotate refresh tokens on successful refresh and block reuse deterministically using cookie-based refresh transport.

#### Scenario: Refresh rotates cookie and invalidates previous token
- **WHEN** `POST /auth/refresh` succeeds using a valid `bb_refresh` cookie
- **THEN** response SHALL return `200` with vendor JSON payload that excludes `refresh_token`, SHALL emit `Set-Cookie` for rotated `bb_refresh`, and the previous refresh token SHALL become unusable immediately

#### Scenario: Refresh reuse is forbidden with canonical problem
- **WHEN** a previously used (rotated) or revoked refresh token is presented through `bb_refresh` in `POST /auth/refresh`
- **THEN** the API SHALL return `403` `application/problem+json` with canonical `type=https://api.budgetbuddy.dev/problems/refresh-reuse-detected`

### Requirement: Transaction restore idempotency
Transaction restore through patch MUST be idempotent.

#### Scenario: Restore archived transaction
- **WHEN** transaction is archived and client sends `PATCH /transactions/{transaction_id}` with `archived_at=null`
- **THEN** `archived_at` SHALL become `null` and response SHALL be `200`

#### Scenario: Restore already-active transaction
- **WHEN** transaction already has `archived_at=null` and client sends same restore patch
- **THEN** API SHALL return `200` with unchanged active state

### Requirement: 204 responses have no response body
The backend MUST return empty bodies for `204 No Content` responses while allowing response headers required for cookie lifecycle control.

#### Scenario: Logout returns no payload and expires refresh cookie
- **WHEN** `/auth/logout` succeeds with `204`
- **THEN** the response SHALL contain no body and SHALL include `Set-Cookie` expiring `bb_refresh` with `Max-Age=0`

### Requirement: Auth cookie transport is explicit in OpenAPI
The OpenAPI contract MUST explicitly document refresh-cookie transport and response headers for auth endpoints.

#### Scenario: Login and refresh document Set-Cookie header
- **WHEN** `POST /auth/login` and `POST /auth/refresh` are reviewed in `backend/openapi.yaml`
- **THEN** each operation SHALL define a `Set-Cookie` response header describing `bb_refresh` attributes (`HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, `Max-Age=<refresh_ttl_seconds>`)

#### Scenario: Set-Cookie Domain policy is explicit
- **WHEN** auth `Set-Cookie` response header definitions are reviewed
- **THEN** documentation SHALL explicitly state that `Domain` is omitted by default (host-only cookie) and may be included only when `REFRESH_COOKIE_DOMAIN` is configured

#### Scenario: Refresh request body is not required by contract
- **WHEN** `POST /auth/refresh` request schema is reviewed
- **THEN** the operation SHALL require refresh authentication via cookie and SHALL NOT require a JSON request body

### Requirement: Auth success payload excludes refresh token
Auth success payloads for login and refresh MUST exclude `refresh_token` from response JSON.

#### Scenario: Login success schema excludes refresh token
- **WHEN** `POST /auth/login` returns `200`
- **THEN** response schema SHALL include `user`, `access_token`, and `access_token_expires_in`, and SHALL NOT include `refresh_token`

#### Scenario: Refresh success schema excludes refresh token
- **WHEN** `POST /auth/refresh` returns `200`
- **THEN** response schema SHALL include `user`, `access_token`, and `access_token_expires_in`, and SHALL NOT include `refresh_token`

### Requirement: Transaction list ordering is deterministic
The API SHALL return `GET /transactions` results with deterministic ordering for the same query inputs.

#### Scenario: Primary ordering by transaction date descending
- **WHEN** a client requests `GET /transactions`
- **THEN** items SHALL be ordered by `date` in descending order (most recent first)

#### Scenario: Stable tie-breaker ordering by created_at descending
- **WHEN** two or more transactions have the same `date`
- **THEN** the API SHALL apply a stable tie-breaker using `created_at` descending

### Requirement: Transaction list filters are combinable and explicit
The API SHALL support combined filtering on transactions using `type`, `account_id`, `category_id`, `from`, `to`, and `include_archived`.

#### Scenario: Combined filters are applied conjunctively
- **WHEN** a client sends multiple supported list filters in a single `GET /transactions` request
- **THEN** the API SHALL apply all provided filters as an AND condition before pagination

#### Scenario: List contract documents supported filter set
- **WHEN** OpenAPI contract is reviewed for `GET /transactions`
- **THEN** it SHALL explicitly document filter parameters and deterministic ordering behavior

### Requirement: Invalid transaction date range returns canonical ProblemDetails
The API SHALL reject invalid date range queries on `GET /transactions` with canonical `400` ProblemDetails.

#### Scenario: From date greater than to date
- **WHEN** `GET /transactions` is called with `from > to`
- **THEN** the API SHALL return `400` with `Content-Type: application/problem+json` and exact `type=https://api.budgetbuddy.dev/problems/invalid-date-range`, `title=Invalid date range`, `status=400`

### Requirement: Cursor format and paging behavior are explicit for list endpoints
The API SHALL document cursor pagination for `GET /accounts`, `GET /categories`, and `GET /transactions` with deterministic behavior.

#### Scenario: Cursor shape is documented
- **WHEN** OpenAPI contract is reviewed for paginated list endpoints
- **THEN** cursor SHALL be documented as an opaque `base64url(JSON)` token with endpoint-specific ordering keys and `next_cursor` semantics

#### Scenario: Terminal page has null cursor
- **WHEN** the final page is reached for a paginated list endpoint
- **THEN** the API SHALL return `next_cursor = null`

### Requirement: Query ordering and cursor keys are aligned
Pagination cursor keys MUST be derived from the same deterministic sort key used by the endpoint query.

#### Scenario: Accounts pagination uses aligned sort and cursor keys
- **WHEN** `GET /accounts` paginates across multiple pages
- **THEN** cursor fields SHALL match the account list sort key and produce deterministic page boundaries

#### Scenario: Categories pagination uses aligned sort and cursor keys
- **WHEN** `GET /categories` paginates across multiple pages
- **THEN** cursor fields SHALL match the category list sort key and produce deterministic page boundaries

#### Scenario: Transactions pagination uses aligned sort and cursor keys
- **WHEN** `GET /transactions` paginates across multiple pages
- **THEN** cursor fields SHALL match the transaction list sort key and produce deterministic page boundaries

### Requirement: Invalid cursor remains canonical
Malformed cursors MUST continue to return canonical invalid-cursor ProblemDetails.

#### Scenario: Invalid cursor returns canonical 400
- **WHEN** a list endpoint receives an invalid cursor token
- **THEN** the API SHALL return `400` with `Content-Type: application/problem+json` and canonical `type=https://api.budgetbuddy.dev/problems/invalid-cursor`, `title=Invalid cursor`, `status=400`

### Requirement: Paging stability expectation under concurrency is documented
The contract SHALL clarify cursor paging stability expectations when data changes concurrently.

#### Scenario: Best-effort stability statement is documented
- **WHEN** API pagination behavior is documented
- **THEN** the contract SHALL state best-effort deterministic paging for stable datasets and clarify that snapshot semantics are not guaranteed unless explicitly provided

### Requirement: API contract remains stable during persistence migration
Switching to DB-backed persistence MUST NOT change the public API contract.

#### Scenario: Success media type remains vendor-specific
- **WHEN** successful endpoints return JSON payloads
- **THEN** responses SHALL continue using `application/vnd.budgetbuddy.v1+json`

#### Scenario: Error payload contract remains ProblemDetails
- **WHEN** API errors are returned
- **THEN** responses SHALL continue using `application/problem+json` with canonical `ProblemDetails`

#### Scenario: Existing statuses and business conflicts are preserved
- **WHEN** requests trigger existing domain rules (archived resources, type mismatch, ownership violations, invalid cursor/range)
- **THEN** HTTP statuses and canonical `type/title/status` values SHALL remain unchanged

### Requirement: Persistence internals are transparent to API consumers
Data-layer migration details MUST remain internal and not leak into the HTTP contract.

#### Scenario: Repository implementation change does not alter response shape
- **WHEN** DB-backed repositories replace current storage paths
- **THEN** endpoint response JSON structure SHALL remain backward compatible with current OpenAPI

### Requirement: Budget endpoints preserve API media-type contract
Budget endpoints MUST follow the established HTTP media-type policy for success and error payloads.

#### Scenario: Budget success payloads use vendor media type
- **WHEN** `GET /budgets`, `POST /budgets`, `GET /budgets/{budget_id}`, or `PATCH /budgets/{budget_id}` succeeds with a response body
- **THEN** the API SHALL return `Content-Type: application/vnd.budgetbuddy.v1+json`

#### Scenario: Budget archive returns empty 204 response
- **WHEN** `DELETE /budgets/{budget_id}` succeeds
- **THEN** the API SHALL return `204` with no response body

#### Scenario: Budget errors use ProblemDetails media type
- **WHEN** a budget endpoint returns validation, authz, negotiation, or business-rule errors
- **THEN** the API SHALL return `Content-Type: application/problem+json` with required `ProblemDetails` fields

### Requirement: Budget endpoint response mapping is explicit in OpenAPI
The OpenAPI contract MUST explicitly define response mappings for budget endpoints, including canonical `401`, `403`, `406`, and budget-specific `409` conflicts.

#### Scenario: Budget list and create responses are documented
- **WHEN** `backend/openapi.yaml` is reviewed for `/budgets`
- **THEN** `GET /budgets` and `POST /budgets` SHALL define success and `application/problem+json` error response mappings

#### Scenario: Budget item responses are documented
- **WHEN** `backend/openapi.yaml` is reviewed for `/budgets/{budget_id}`
- **THEN** `GET`, `PATCH`, and `DELETE` SHALL define success and `application/problem+json` error response mappings

#### Scenario: Budget conflict responses are canonical
- **WHEN** OpenAPI defines `409` responses for budget writes
- **THEN** the documented `ProblemDetails` values SHALL include canonical conflict types for duplicate budget key, category archived, and category ownership conflict

### Requirement: Budget resource schemas are explicit in OpenAPI components
The OpenAPI contract MUST define reusable budget schemas for request/response payloads used by budget endpoints.

#### Scenario: Budget schemas exist and are referenced by endpoints
- **WHEN** OpenAPI components and budget path operations are reviewed
- **THEN** schemas `Budget`, `BudgetCreate`, `BudgetUpdate`, and `BudgetListResponse` SHALL exist and SHALL be referenced by corresponding budget operations

### Requirement: Auth endpoints expose explicit 429 mappings
The OpenAPI contract MUST document `429 Too Many Requests` responses for `POST /auth/login` and `POST /auth/refresh`.

#### Scenario: Login operation documents 429 ProblemDetails
- **WHEN** `backend/openapi.yaml` is reviewed for `POST /auth/login`
- **THEN** the operation SHALL include a `429` response with `application/problem+json` mapped to `ProblemDetails`

#### Scenario: Refresh operation documents 429 ProblemDetails
- **WHEN** `backend/openapi.yaml` is reviewed for `POST /auth/refresh`
- **THEN** the operation SHALL include a `429` response with `application/problem+json` mapped to `ProblemDetails`

### Requirement: Retry guidance contract for throttled auth responses
The HTTP contract MUST define deterministic retry guidance for throttled auth responses.

#### Scenario: Retry-After behavior is documented
- **WHEN** auth endpoints return `429`
- **THEN** the contract SHALL define `Retry-After` behavior and format expectations for clients

#### Scenario: Existing auth success contract is unchanged under limit
- **WHEN** requests remain within configured thresholds
- **THEN** auth endpoint success statuses and payload media type SHALL remain unchanged from existing contract behavior

### Requirement: Audit endpoint contract is explicit in OpenAPI
The OpenAPI contract MUST document `GET /audit` with owner-scoped query parameters, deterministic pagination, and canonical media types.

#### Scenario: Audit list operation is documented
- **WHEN** `backend/openapi.yaml` is reviewed for `GET /audit`
- **THEN** it SHALL define `from`, `to`, `cursor`, and `limit` query parameters and a paginated response schema

#### Scenario: Audit success media type is vendor-specific
- **WHEN** `GET /audit` succeeds
- **THEN** the response SHALL use `application/vnd.budgetbuddy.v1+json`

### Requirement: Audit error mappings are canonical
Audit endpoint errors MUST be mapped to `application/problem+json` with canonical statuses.

#### Scenario: Audit endpoint documents authz and negotiation errors
- **WHEN** `GET /audit` contract responses are reviewed
- **THEN** it SHALL include canonical `401`, `403`, and `406` mappings using `ProblemDetails`

#### Scenario: Audit endpoint documents validation errors
- **WHEN** `GET /audit` contract responses are reviewed
- **THEN** it SHALL include canonical `400` mappings for invalid cursor and invalid date range

### Requirement: Audit schemas are reusable OpenAPI components
The OpenAPI contract MUST define reusable schemas for audit items and list responses.

#### Scenario: Audit schemas are referenced by endpoint
- **WHEN** components and `/audit` operation are reviewed
- **THEN** schemas for audit event item and paginated list SHALL be defined and referenced by `GET /audit`

### Requirement: OpenAPI operations include success and error examples
The OpenAPI contract MUST provide at least one success example and one error example per documented operation, and every `application/problem+json` example MUST match the canonical ProblemDetails identity for that specific response mapping.

#### Scenario: Success example is present for response body operations
- **WHEN** an operation returns a successful response body
- **THEN** the corresponding success response content SHALL include at least one example matching schema and vendor media type

#### Scenario: Error example is present for operation error mapping
- **WHEN** an operation documents one or more error statuses
- **THEN** at least one documented error response SHALL include a ProblemDetails example matching canonical media type

#### Scenario: Response-level ProblemDetails examples are semantically correct
- **WHEN** an operation response documents `application/problem+json` examples
- **THEN** the example SHALL match the declared response semantics and canonical `type/title/status` for that endpoint/status pair

### Requirement: Invalid cursor and invalid date range examples are context-specific
OpenAPI list endpoint responses MUST not cross-map cursor and date-range ProblemDetails examples.

#### Scenario: Invalid cursor example appears only on cursor error mappings
- **WHEN** list endpoints document `400` invalid cursor behavior
- **THEN** the mapped ProblemDetails example SHALL use canonical invalid-cursor identity and SHALL NOT use invalid-date-range examples

#### Scenario: Invalid date range example appears only on date-range validation mappings
- **WHEN** endpoints document `from/to` date-range validation failures
- **THEN** the mapped ProblemDetails example SHALL use canonical invalid-date-range identity and SHALL NOT use invalid-cursor examples

### Requirement: Domain conflict examples are operation-appropriate
OpenAPI `409` examples MUST reflect the concrete business conflict(s) applicable to each operation.

#### Scenario: Transaction conflict examples are canonical and conflict-specific
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` documents `409`
- **THEN** mapped examples SHALL be limited to canonical transaction conflicts (`account-archived`, `category-archived`, `category-type-mismatch`) relevant to that operation

#### Scenario: Budget conflict examples are canonical and conflict-specific
- **WHEN** budget write operations document `409`
- **THEN** mapped examples SHALL be limited to canonical budget conflicts (including duplicate key and archived/non-owned category conflicts) relevant to that operation

### Requirement: OpenAPI examples remain contract-aligned
Examples MUST remain consistent with schema constraints and media-type rules.

#### Scenario: Success examples use vendor media type
- **WHEN** a success example is defined
- **THEN** it SHALL be under `application/vnd.budgetbuddy.v1+json` and validate against the referenced response schema

#### Scenario: Error examples use ProblemDetails media type
- **WHEN** an error example is defined
- **THEN** it SHALL be under `application/problem+json` and include required ProblemDetails fields

### Requirement: Archived semantics are explicit in API contract
The OpenAPI contract MUST explicitly describe soft-delete archive behavior for accounts, categories, and transactions.

#### Scenario: Delete operations are documented as archive semantics
- **WHEN** `/accounts/{account_id}`, `/categories/{category_id}`, and `/transactions/{transaction_id}` delete operations are reviewed
- **THEN** descriptions SHALL state archive (soft-delete) semantics and not hard-delete semantics

#### Scenario: Ownership and authz wording remains canonical
- **WHEN** archived-resource access responses are documented
- **THEN** canonical `401/403/406` wording SHALL remain consistent with contract conventions

### Requirement: List endpoint archived policy is explicit
List endpoints MUST document default exclusion of archived resources and opt-in inclusion behavior.

#### Scenario: Default list behavior excludes archived resources
- **WHEN** list endpoints for accounts/categories/transactions are documented
- **THEN** documentation SHALL state archived resources are excluded unless `include_archived=true`

#### Scenario: include_archived toggle includes archived resources
- **WHEN** `include_archived=true` is provided
- **THEN** contract SHALL specify that archived resources are included in list results

### Requirement: CORS response behavior is explicit for credentialed browser clients
The HTTP contract MUST define credentialed CORS behavior required for cross-site cookie-based auth flows.

#### Scenario: Actual request from allowed origin includes credential headers
- **WHEN** an allowed frontend origin calls an API endpoint with `Origin` header
- **THEN** the response SHALL include `Access-Control-Allow-Origin` equal to that origin and `Access-Control-Allow-Credentials: true`

### Requirement: Preflight behavior is contractually stable for auth cookie routes
The HTTP contract MUST guarantee valid CORS preflight behavior for auth endpoints used by browser refresh flows.

#### Scenario: Auth refresh preflight returns valid CORS metadata
- **WHEN** `OPTIONS /api/auth/refresh` is requested by an allowed origin with requested method/headers
- **THEN** the API SHALL return a successful preflight response with CORS allow-origin, allow-credentials, allow-methods, and allow-headers metadata

### Requirement: CORS operational header visibility is documented
The HTTP contract MUST expose which headers are readable by browser clients in cross-site mode.

#### Scenario: Exposed headers are listed for frontend integrations
- **WHEN** contract documentation is reviewed for cross-site usage
- **THEN** it SHALL specify that `X-Request-Id` and `Retry-After` are exposed via CORS for frontend consumption

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

### Requirement: Register success payload matches auth session shape
The HTTP contract MUST define `POST /auth/register` success body using `AuthSessionResponse` semantics and MUST NOT expose `refresh_token` in JSON.

#### Scenario: Register success excludes refresh token from body
- **WHEN** `POST /auth/register` succeeds
- **THEN** the API SHALL return `201` with `Content-Type: application/vnd.budgetbuddy.v1+json` and payload fields `user`, `access_token`, `access_token_expires_in` only

### Requirement: Register contract documents refresh cookie transport
The OpenAPI contract MUST explicitly document `Set-Cookie` refresh transport for register success.

#### Scenario: Register success includes Set-Cookie header mapping
- **WHEN** `POST /auth/register` success response is reviewed in OpenAPI
- **THEN** it SHALL define `Set-Cookie` header semantics for `bb_refresh` cookie attributes consistent with login/refresh

### Requirement: Register examples are aligned with cookie-only refresh model
Register success examples MUST not include `refresh_token` in JSON body.

#### Scenario: Register success examples exclude refresh token
- **WHEN** OpenAPI examples for `POST /auth/register` are reviewed
- **THEN** success examples SHALL omit `refresh_token` and remain schema-valid under `AuthSessionResponse`

### Requirement: Auth endpoints document request correlation header
The HTTP contract MUST explicitly document `X-Request-Id` response header behavior for core auth session endpoints.

#### Scenario: Login response mappings include request-id header
- **WHEN** `POST /auth/login` response mappings are reviewed
- **THEN** documented success and error responses SHALL include `X-Request-Id` header reference

#### Scenario: Refresh response mappings include request-id header
- **WHEN** `POST /auth/refresh` response mappings are reviewed
- **THEN** documented success and error responses SHALL include `X-Request-Id` header reference

#### Scenario: Logout response mappings include request-id header
- **WHEN** `POST /auth/logout` response mappings are reviewed
- **THEN** documented `204` and error responses SHALL include `X-Request-Id` header reference

### Requirement: Auth request-id contract reflects runtime behavior
Documented request-id behavior for auth endpoints MUST match middleware-emitted runtime headers.

#### Scenario: Runtime auth responses include request-id
- **WHEN** clients call login/refresh/logout endpoints
- **THEN** responses SHALL include non-empty `X-Request-Id` header

### Requirement: Bearer access token format is standards-aligned
The API contract MUST describe bearer access tokens as JWT-compatible while keeping the existing authorization transport unchanged.

#### Scenario: Authorization transport remains unchanged
- **WHEN** authenticated endpoints are called
- **THEN** clients SHALL continue sending `Authorization: Bearer <access_token>`

#### Scenario: Contract clarifies JWT interoperability expectations
- **WHEN** auth endpoint docs are reviewed
- **THEN** they SHALL state that access tokens are signed JWTs and that invalid/expired tokens return canonical `401` ProblemDetails

### Requirement: Auth Set-Cookie domain policy is explicit
The HTTP contract MUST explicitly describe refresh-cookie `Domain` behavior so clients can reason about host-only and shared-subdomain deployments.

#### Scenario: Login and refresh Set-Cookie describe default host-only behavior
- **WHEN** `Set-Cookie-Refresh` header docs are reviewed for auth success responses
- **THEN** they SHALL state that `Domain` is omitted by default, yielding a host-only cookie scoped to the API host

#### Scenario: Contract documents optional configured Domain attribute
- **WHEN** deployers set `REFRESH_COOKIE_DOMAIN`
- **THEN** docs SHALL state that `Set-Cookie` may include `Domain=<configured_domain>` for shared-subdomain cookie scope

#### Scenario: Logout clear-cookie semantics preserve domain policy clarity
- **WHEN** `Set-Cookie-Refresh-Cleared` header docs are reviewed
- **THEN** they SHALL document the same default/optional `Domain` behavior for deterministic cookie clearing

### Requirement: Refresh endpoint contract documents origin-guarded failure mode
The HTTP contract MUST define deterministic behavior for origin-rejected refresh requests.

#### Scenario: Refresh documents canonical origin-blocked response
- **WHEN** `POST /auth/refresh` is reviewed in OpenAPI
- **THEN** it SHALL include `403` response with `application/problem+json` for blocked-origin decisions
- **AND** response examples SHALL be aligned with canonical problem type/title/status

#### Scenario: Refresh still supports trusted non-browser mode when configured
- **WHEN** refresh request has no `Origin` header and missing-origin mode is configured to allow trusted calls
- **THEN** contract semantics SHALL preserve normal refresh success/error mappings for token validation paths
