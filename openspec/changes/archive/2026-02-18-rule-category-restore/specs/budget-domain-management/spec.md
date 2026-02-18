## MODIFIED Requirements

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

### Requirement: Ownership and access control across domain resources
The backend MUST enforce authenticated user ownership for accounts, categories, and transactions.

#### Scenario: Unauthenticated resource access
- **WHEN** a protected domain endpoint is called without valid access token
- **THEN** the API SHALL return `401` as `ProblemDetails`

#### Scenario: Resource exists but is not accessible
- **WHEN** a valid user token references a resource not owned by that user
- **THEN** the API SHALL return `403` as `ProblemDetails`

#### Scenario: Restoring other user's category is forbidden
- **WHEN** `PATCH /categories/{category_id}` sets `archived_at=null` for a category owned by a different user
- **THEN** the API SHALL return `403` as `ProblemDetails`
