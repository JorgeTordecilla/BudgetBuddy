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
The backend MUST implement `/categories` and `/categories/{category_id}` with list filters, CRUD/archive semantics, and type-aware uniqueness rules.

#### Scenario: List categories filtered by type
- **WHEN** `GET /categories` is called with `type=income` or `type=expense`
- **THEN** the API SHALL return only categories of that type with `{ items, next_cursor }`

#### Scenario: Category uniqueness by type
- **WHEN** a user creates or renames a category to an existing name of the same type
- **THEN** the API SHALL return `409` as `ProblemDetails`

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, and archive semantics including all documented filters.

#### Scenario: List transactions with filters
- **WHEN** `GET /transactions` is called with optional filters (`type`, `account_id`, `category_id`, `from`, `to`, `include_archived`, `cursor`, `limit`)
- **THEN** the API SHALL return `200` ordered most recent first with `{ items, next_cursor }`

#### Scenario: Transaction business-rule conflict
- **WHEN** a transaction write violates domain constraints (for example archived account or type mismatch)
- **THEN** the API SHALL return `409` as `ProblemDetails`

### Requirement: Ownership and access control across domain resources
The backend MUST enforce authenticated user ownership for accounts, categories, and transactions.

#### Scenario: Unauthenticated resource access
- **WHEN** a protected domain endpoint is called without valid access token
- **THEN** the API SHALL return `401` as `ProblemDetails`

#### Scenario: Resource exists but is not accessible
- **WHEN** a valid user token references a resource not owned by that user
- **THEN** the API SHALL return `403` as `ProblemDetails`
