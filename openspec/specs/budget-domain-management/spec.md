## Purpose
Define domain behavior for budgeting resources and related domain entities, including ownership, archive semantics, and invariants.
## Requirements
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

#### Scenario: Account creation with non-zero initial balance creates opening transaction
- **WHEN** `POST /accounts` succeeds and `initial_balance_cents` is non-zero
- **THEN** the backend SHALL create exactly one opening transaction for the created account in the same write unit
- **AND** that transaction SHALL be visible from `GET /transactions` for the account owner.

#### Scenario: Account creation with zero initial balance does not create opening transaction
- **WHEN** `POST /accounts` succeeds and `initial_balance_cents` is zero
- **THEN** no synthetic opening transaction SHALL be created.

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
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, archive, and restore semantics including all documented filters, while enforcing strict money invariants for `amount_cents` and currency consistency.

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
- **THEN** the API SHALL reject with `409` `ProblemDetails` and canonical `type=https://api.bebudget.dev/problems/account-archived`, `title=Account is archived`, `status=409`

#### Scenario: Category type mismatch on transaction write is rejected
- **WHEN** a client calls `POST /transactions` or `PATCH /transactions/{transaction_id}` with `type` not matching selected `category.type`
- **THEN** the API SHALL reject with `409` `ProblemDetails` and canonical `type=https://api.bebudget.dev/problems/category-type-mismatch`, `title=Category type mismatch`, `status=409`

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

#### Scenario: amount_cents must be an integer on create
- **WHEN** `POST /transactions` provides a non-integer `amount_cents` value
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: amount_cents must be an integer on patch
- **WHEN** `PATCH /transactions/{transaction_id}` provides a non-integer `amount_cents` value
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: amount_cents is rejected when zero or sign-invalid
- **WHEN** a transaction write provides `amount_cents=0` or a sign that violates the domain sign rule for the effective transaction type
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails
- **AND** automated backend regression coverage SHALL include transaction creation with negative `amount_cents` enforced through money-invariant domain validation

#### Scenario: amount_cents is rejected when out of safe bounds
- **WHEN** a transaction write provides `amount_cents` beyond configured safe limits
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

#### Scenario: transaction currency must match user currency
- **WHEN** a transaction write resolves to a money operation with a currency different from the authenticated user's `currency_code`
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails

### Requirement: Transactions import/export rate limiting is deterministic and policy-scoped
Transaction import/export endpoints SHALL enforce deterministic rate limits using transaction-scoped policy settings independent from auth endpoint throttling controls.

#### Scenario: Transaction rate-limit window is transaction-scoped
- **WHEN** transaction import/export throttling is evaluated
- **THEN** the rate-limit window SHALL be derived from transaction-specific configuration
- **AND** SHALL NOT depend on auth rate-limit window configuration.

#### Scenario: Auth window tuning does not alter transaction throttling window
- **WHEN** auth rate-limit window configuration changes
- **THEN** transaction import/export rate-limit window behavior SHALL remain unchanged unless transaction window configuration also changes.

### Requirement: Transactions support explicit income-source attribution
Transaction domain behavior MUST support optional linkage to user-owned income sources for deterministic analytics attribution.

#### Scenario: Income transaction may reference income source
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` sets `income_source_id` and effective type is `income`
- **THEN** the API SHALL accept only owned, non-archived income source identifiers

#### Scenario: Expense transaction cannot reference income source
- **WHEN** transaction effective type is `expense` and `income_source_id` is provided
- **THEN** the API SHALL reject the write with canonical validation `400` ProblemDetails

#### Scenario: Linked non-owned income source is rejected
- **WHEN** a transaction write references an income source not owned by authenticated user
- **THEN** the API SHALL reject with canonical `403` or documented conflict semantics consistently across transaction ownership rules

#### Scenario: Cross-user income_source_id is rejected on create and patch
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` references an `income_source_id` owned by a different authenticated user
- **THEN** the API SHALL reject with documented ownership conflict semantics and SHALL NOT persist the linkage

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

### Requirement: Domain mutation actions emit audit trail events
Account, category, and transaction mutation flows MUST emit audit events for traceability.

#### Scenario: Account mutation actions are audited
- **WHEN** account create, patch, or archive actions succeed
- **THEN** an audit event SHALL be persisted with resource type `account` and the corresponding action

#### Scenario: Category mutation actions are audited
- **WHEN** category create, patch, archive, or restore actions succeed
- **THEN** an audit event SHALL be persisted with resource type `category` and the corresponding action

#### Scenario: Transaction mutation actions are audited
- **WHEN** transaction create, patch, archive, or restore actions succeed
- **THEN** an audit event SHALL be persisted with resource type `transaction` and the corresponding action

### Requirement: Audit emission remains low-overhead and safe
Domain write paths MUST keep audit emission lightweight and free of sensitive payload persistence.

#### Scenario: Audit write is minimal and deterministic per action
- **WHEN** a tracked domain mutation succeeds
- **THEN** the system SHALL persist a single normalized audit event without additional heavy payload capture

#### Scenario: Audit event payload excludes secrets
- **WHEN** domain audit events are stored
- **THEN** event data SHALL exclude token-like, credential-like, and secret-like values

### Requirement: Runtime list behavior for archived resources is consistent
Accounts, categories, and transactions list endpoints MUST enforce one archived inclusion policy.

#### Scenario: Default list requests exclude archived resources
- **WHEN** caller omits `include_archived` (or sets it to false)
- **THEN** list responses SHALL exclude archived rows for accounts/categories/transactions

#### Scenario: Explicit include_archived enables archived rows
- **WHEN** caller sets `include_archived=true`
- **THEN** list responses SHALL include archived and non-archived rows for accounts/categories/transactions

### Requirement: Archive state handling is consistent for related behaviors
Runtime behaviors that consume archived resources MUST follow the same archive policy boundaries.

#### Scenario: Resource retrieval remains ownership-scoped regardless archive state
- **WHEN** an owned archived resource is fetched by id
- **THEN** ownership/auth rules SHALL be applied consistently without archive-policy drift

#### Scenario: Import/write paths continue to enforce archived conflicts
- **WHEN** import or write operations reference archived account/category resources where forbidden by domain rules
- **THEN** runtime SHALL return canonical business-rule conflicts consistently

### Requirement: Transactions resource supports optional mood and impulse enrichment
The backend MUST accept and return optional `mood` and `is_impulse` fields for transaction create, update, get, and list operations.

#### Scenario: Create transaction without enrichment
- **WHEN** `POST /transactions` omits `mood` and `is_impulse`
- **THEN** the API SHALL return `201` and the created resource SHALL expose `mood=null` and `is_impulse=null`.

#### Scenario: Create transaction with valid mood and impulse
- **WHEN** `POST /transactions` includes a valid mood and a boolean `is_impulse`
- **THEN** the API SHALL return `201` and persist both enrichment values.

#### Scenario: Patch transaction clears enrichment fields
- **WHEN** `PATCH /transactions/{transaction_id}` sends explicit `mood=null` and/or `is_impulse=null`
- **THEN** the API SHALL return `200` and clear only those enrichment fields without mutating unrelated transaction properties.

### Requirement: Invalid mood values map to canonical ProblemDetails
The backend MUST reject non-canonical `mood` values with deterministic ProblemDetails mapping.

#### Scenario: Invalid mood returns canonical 422
- **WHEN** transaction create or update receives `mood` outside the allowed taxonomy
- **THEN** the API SHALL return `422` with canonical ProblemDetails `type=https://api.bebudget.dev/problems/transaction-mood-invalid`.

### Requirement: Transactions CSV export includes enrichment columns
The backend MUST expose enrichment fields in transactions CSV export as additive trailing columns.

#### Scenario: CSV header includes enrichment columns at the end
- **WHEN** `GET /transactions/export` returns `200 text/csv`
- **THEN** CSV header SHALL include `mood` and `is_impulse` after existing columns.

#### Scenario: CSV renders null enrichment as empty strings
- **WHEN** an exported transaction has `mood=null` or `is_impulse=null`
- **THEN** the corresponding CSV cell SHALL be empty.
