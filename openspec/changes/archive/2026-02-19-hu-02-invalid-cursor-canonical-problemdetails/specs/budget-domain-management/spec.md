## MODIFIED Requirements

### Requirement: Accounts resource behavior
The backend MUST implement `/accounts` and `/accounts/{account_id}` with create, list, get, update, and archive behavior matching OpenAPI schemas and statuses.

#### Scenario: List accounts with pagination
- **WHEN** a user requests `GET /accounts` with optional `include_archived`, `cursor`, and `limit`
- **THEN** the API SHALL return `200` with `{ items, next_cursor }` and honor filter and limit semantics

#### Scenario: Invalid accounts cursor is rejected
- **WHEN** `GET /accounts` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails

### Requirement: Categories resource behavior
The backend MUST implement `/categories` and `/categories/{category_id}` with list filters and CRUD/archive semantics.

#### Scenario: List categories filtered by type
- **WHEN** `GET /categories` is called with `type=income` or `type=expense`
- **THEN** the API SHALL return only categories of that type with `{ items, next_cursor }`

#### Scenario: Invalid categories cursor is rejected
- **WHEN** `GET /categories` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, and archive semantics including documented filters.

#### Scenario: List transactions with filters
- **WHEN** `GET /transactions` is called with optional filters (`type`, `account_id`, `category_id`, `from`, `to`, `include_archived`, `cursor`, `limit`)
- **THEN** the API SHALL return `200` ordered most recent first with `{ items, next_cursor }`

#### Scenario: Invalid transactions cursor is rejected
- **WHEN** `GET /transactions` receives an invalid `cursor`
- **THEN** the API SHALL return canonical invalid-cursor `400` ProblemDetails
