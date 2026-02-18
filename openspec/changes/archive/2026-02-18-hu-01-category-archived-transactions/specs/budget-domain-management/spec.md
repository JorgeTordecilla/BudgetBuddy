## MODIFIED Requirements

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, and archive semantics including all documented filters and business conflict rules.

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

### Requirement: Ownership and access control across domain resources
The backend MUST enforce authenticated user ownership for accounts, categories, and transactions.

#### Scenario: Unauthenticated resource access
- **WHEN** a protected domain endpoint is called without valid access token
- **THEN** the API SHALL return canonical `401` ProblemDetails

#### Scenario: Resource exists but is not accessible
- **WHEN** a valid user token references a resource not owned by that user
- **THEN** the API SHALL return canonical `403` ProblemDetails
