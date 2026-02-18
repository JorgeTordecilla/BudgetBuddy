## ADDED Requirements

### Requirement: Accounts resource behavior
The backend MUST implement `/accounts` and `/accounts/{account_id}` with create, list, get, update, and archive behavior matching OpenAPI schemas and statuses.

#### Scenario: List accounts with pagination
- **WHEN** a user requests `GET /accounts` with optional `include_archived`, `cursor`, and `limit`
- **THEN** the API SHALL return `200` with `{ items, next_cursor }` and honor the filter and limit semantics

#### Scenario: Create account conflict
- **WHEN** a user creates an account name that already exists under the uniqueness rule
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Access forbidden account
- **WHEN** a user requests an account not owned by that user
- **THEN** the API SHALL return `403` as `ProblemDetails`

### Requirement: Categories resource behavior
The backend MUST implement `/categories` and `/categories/{category_id}` with list filters, CRUD/archive semantics, type-aware uniqueness rules, and restore semantics through patch updates.

#### Scenario: List categories filtered by type
- **WHEN** `GET /categories` is called with `type=income` or `type=expense`
- **THEN** the API SHALL return only categories of that type with `{ items, next_cursor }`

#### Scenario: Category uniqueness by type
- **WHEN** a user creates or renames a category to an existing name of the same type
- **THEN** the API SHALL return `409` as `ProblemDetails`

#### Scenario: Archived category is restored via patch
- **WHEN** a client archives a category and then calls `PATCH /categories/{category_id}` with `archived_at=null` using a valid owner token
- **THEN** the API SHALL restore the category and return `200` with `Category` where `archived_at=null`

#### Scenario: Restore is idempotent for already active category
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at=null` for a category that already has `archived_at=null`
- **THEN** the API SHALL return `200` with the current `Category` payload and no business-rule conflict

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, and archive semantics including all documented filters.

#### Scenario: List transactions with filters
- **WHEN** `GET /transactions` is called with optional filters (`type`, `account_id`, `category_id`, `from`, `to`, `include_archived`, `cursor`, `limit`)
- **THEN** the API SHALL return `200` ordered most recent first with `{ items, next_cursor }`

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


