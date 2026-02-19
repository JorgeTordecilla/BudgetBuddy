## ADDED Requirements

### Requirement: Accounts resource behavior
The backend MUST implement `/accounts` and `/accounts/{account_id}` with create, list, get, update, and archive behavior matching OpenAPI schemas and statuses.

#### Scenario: List accounts with pagination
- **WHEN** a user requests `GET /accounts` with optional `include_archived`, `cursor`, and `limit`
- **THEN** the API SHALL return `200` with `{ items, next_cursor }` and honor the filter and limit semantics

#### Scenario: Invalid accounts cursor is rejected
- **WHEN** `GET /accounts` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails

#### Scenario: Create account conflict
- **WHEN** a user creates an account name that already exists under the uniqueness rule
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Access forbidden account
- **WHEN** a user requests an account not owned by that user
- **THEN** the API SHALL return `403` as `ProblemDetails`

#### Scenario: Non-owned account access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/accounts/{account_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails

### Requirement: Categories resource behavior
The backend MUST implement `/categories` and `/categories/{category_id}` with list filters, CRUD/archive semantics, type-aware uniqueness rules, and restore semantics through patch updates.

#### Scenario: List categories filtered by type
- **WHEN** `GET /categories` is called with `type=income` or `type=expense`
- **THEN** the API SHALL return only categories of that type with `{ items, next_cursor }`

#### Scenario: Invalid categories cursor is rejected
- **WHEN** `GET /categories` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails

#### Scenario: Category uniqueness by type
- **WHEN** a user creates or renames a category to an existing name of the same type
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Archived category is restored via patch
- **WHEN** a client archives a category and then calls `PATCH /categories/{category_id}` with `archived_at=null` using a valid owner token
- **THEN** the API SHALL restore the category and return `200` with `Category` where `archived_at=null`

#### Scenario: Restore is idempotent for already active category
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at=null` for a category that already has `archived_at=null`
- **THEN** the API SHALL return `200` with the current `Category` payload and no business-rule conflict

#### Scenario: Non-owned category access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/categories/{category_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, archive, and restore semantics including all documented filters.

#### Scenario: List transactions with filters
- **WHEN** `GET /transactions` is called with optional filters (`type`, `account_id`, `category_id`, `from`, `to`, `include_archived`, `cursor`, `limit`)
- **THEN** the API SHALL return `200` ordered most recent first with `{ items, next_cursor }`

#### Scenario: Invalid transactions cursor is rejected
- **WHEN** `GET /transactions` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails

#### Scenario: Transaction business-rule conflict
- **WHEN** a transaction write violates domain constraints (for example archived account, archived category, or type mismatch)
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Create transaction with archived category is rejected
- **WHEN** `POST /transactions` uses `category_id` for a category with `archived_at != null`
- **THEN** the API SHALL reject with canonical category archived `409` ProblemDetails

#### Scenario: Patch transaction with archived effective category is rejected
- **WHEN** `PATCH /transactions/{transaction_id}` resolves to an archived category (by changing `category_id` or keeping existing archived category)
- **THEN** the API SHALL reject with canonical category archived `409` ProblemDetails

#### Scenario: Creating transaction on archived account is rejected
- **WHEN** a client calls `POST /transactions` with an `account_id` that belongs to the user and has `archived_at != null`
- **THEN** the API SHALL reject with `409` `ProblemDetails` and canonical `type=https://api.budgetbuddy.dev/problems/account-archived`, `title=Account is archived`, `status=409`

#### Scenario: Category type mismatch on transaction write is rejected
- **WHEN** a client calls `POST /transactions` or `PATCH /transactions/{transaction_id}` with `type` not matching selected `category.type`
- **THEN** the API SHALL reject with `409` `ProblemDetails` and canonical `type=https://api.budgetbuddy.dev/problems/category-type-mismatch`, `title=Category type mismatch`, `status=409`

#### Scenario: Income transaction with expense category is rejected
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` uses `type=income` and `category.type=expense`
- **THEN** the API SHALL reject with `409` mismatch ProblemDetails

#### Scenario: Expense transaction with income category is rejected
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` uses `type=expense` and `category.type=income`
- **THEN** the API SHALL reject with `409` mismatch ProblemDetails

#### Scenario: Non-owned transaction access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/transactions/{transaction_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Archived transaction is restored via patch
- **WHEN** owner calls `PATCH /transactions/{transaction_id}` with `archived_at=null` for an archived transaction
- **THEN** transaction SHALL be restored and API SHALL return `200` with `Transaction`

#### Scenario: Transaction restore is idempotent
- **WHEN** owner calls `PATCH /transactions/{transaction_id}` with `archived_at=null` for an already-active transaction
- **THEN** API SHALL return `200` and keep active state without conflict

#### Scenario: Restore blocked for non-owner
- **WHEN** authenticated non-owner calls restore patch for another user's transaction
- **THEN** API SHALL return canonical `403` ProblemDetails

### Requirement: Ownership and access control across domain resources
The backend MUST enforce authenticated user ownership for accounts, categories, and transactions.

#### Scenario: Unauthenticated resource access
- **WHEN** a protected domain endpoint is called without valid access token
- **THEN** the API SHALL return canonical `401` ProblemDetails

#### Scenario: Resource exists but is not accessible
- **WHEN** a valid user token references a resource not owned by that user
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Restoring other user's category is forbidden
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at=null` for a category owned by a different user
- **THEN** the API SHALL return `403` as `ProblemDetails`

#### Scenario: Restore category matrix asserts canonical authz errors
- **WHEN** restore category tests exercise unauthenticated and cross-user paths
- **THEN** the API SHALL return exact canonical `type`, `title`, and `status` for `401` and `403`

### Requirement: Authentication lifecycle behavior
The backend MUST implement register/login/refresh/logout behavior aligned to OpenAPI and secure session management.

#### Scenario: Refresh token replay is rejected
- **WHEN** a previously rotated refresh token is reused
- **THEN** the API SHALL reject with canonical `403` refresh-reuse-detected ProblemDetails

#### Scenario: Refresh token invalid or expired is rejected
- **WHEN** refresh token is malformed, signature-invalid, or expired
- **THEN** the API SHALL reject with canonical `401` ProblemDetails

#### Scenario: Logout revokes active refresh token(s)
- **WHEN** a user calls logout with active session refresh token(s)
- **THEN** those refresh token(s) SHALL be marked revoked and cannot be used again in `POST /auth/refresh`

#### Scenario: Refresh token storage is hashed
- **WHEN** refresh token state is persisted
- **THEN** token values SHALL be stored hashed and resolved via indexed lookup path

### Requirement: Transaction listing uses a stable domain ordering
Transaction listing behavior MUST be stable and deterministic for equivalent filter inputs.

#### Scenario: Domain sort is most recent first with deterministic ties
- **WHEN** list queries resolve multiple transactions
- **THEN** domain ordering SHALL be `date desc` with tie-breaker `created_at desc`

### Requirement: Transaction list filters are evaluated in one effective predicate
Transaction listing MUST evaluate optional filters consistently for domain correctness.

#### Scenario: Combined filters narrow result set deterministically
- **WHEN** `type`, `account_id`, `category_id`, `from`, and `to` are provided
- **THEN** the list result SHALL only contain transactions satisfying all provided constraints

#### Scenario: Include archived toggles archived visibility
- **WHEN** `include_archived=false` or omitted
- **THEN** archived transactions SHALL be excluded from list results

### Requirement: Invalid date range is rejected before data fetch
Transaction listing MUST fail fast for invalid date-range predicates.

#### Scenario: Invalid range is rejected
- **WHEN** `from` is later than `to`
- **THEN** the request SHALL fail with canonical invalid-date-range `400` ProblemDetails

### Requirement: Deterministic paging without duplicates or skips for stable datasets
Domain list pagination MUST return deterministic page slices for stable datasets.

#### Scenario: Accounts pagination over 25 records with limit 10
- **WHEN** `GET /accounts?limit=10` is paged until `next_cursor=null`
- **THEN** combined pages SHALL contain all expected records with no duplicates and no skipped items

#### Scenario: Categories pagination over 25 records with limit 10
- **WHEN** `GET /categories?limit=10` is paged until `next_cursor=null`
- **THEN** combined pages SHALL contain all expected records with no duplicates and no skipped items

#### Scenario: Transactions pagination over 25 records with limit 10
- **WHEN** `GET /transactions?limit=10` is paged until `next_cursor=null`
- **THEN** combined pages SHALL contain all expected records with no duplicates and no skipped items

### Requirement: Endpoint sort order and cursor boundary predicates are consistent
Each list endpoint MUST apply cursor boundary predicates using the same ordered fields used in `ORDER BY`.

#### Scenario: Cursor boundary matches account ordering
- **WHEN** account list applies cursor filtering
- **THEN** boundary predicates SHALL be based on the same ordered fields as account query sorting

#### Scenario: Cursor boundary matches category ordering
- **WHEN** category list applies cursor filtering
- **THEN** boundary predicates SHALL be based on the same ordered fields as category query sorting

#### Scenario: Cursor boundary matches transaction ordering
- **WHEN** transaction list applies cursor filtering
- **THEN** boundary predicates SHALL be based on the same ordered fields as transaction query sorting

### Requirement: Runtime persistence is backed by a real database
Domain entities MUST be persisted in a real relational database rather than ephemeral in-memory state.

#### Scenario: Entity writes survive process restart
- **WHEN** users create or update domain resources (`accounts`, `categories`, `transactions`)
- **THEN** persisted records SHALL remain available after process restart

#### Scenario: User-scoped reads use persisted records
- **WHEN** list or get endpoints read domain resources
- **THEN** responses SHALL be sourced from DB-backed persistence with existing ownership/business rule behavior unchanged

### Requirement: DB schema is managed with reproducible migrations
Schema changes MUST be tracked and applied through migrations.

#### Scenario: Initial schema migration creates core tables
- **WHEN** migration tool applies initial revision
- **THEN** tables for `users`, `accounts`, `categories`, `transactions`, and `refresh_tokens` SHALL be created

#### Scenario: Migration command succeeds in verification
- **WHEN** `alembic upgrade head` is executed
- **THEN** migration SHALL complete successfully on supported environment configuration

### Requirement: Query performance has baseline indexing
Persistence schema MUST include baseline indexes for common access patterns.

#### Scenario: User-scoped listing path is indexed
- **WHEN** list endpoints filter/sort by user and time fields
- **THEN** schema SHALL include indexes supporting `user_id` + ordering fields (`created_at` and/or `date`)

#### Scenario: Refresh token lookup path is indexed
- **WHEN** auth flows resolve refresh tokens
- **THEN** schema SHALL include an index suitable for token hash lookup

