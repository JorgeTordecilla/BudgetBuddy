## MODIFIED Requirements

### Requirement: Accounts resource behavior
The backend MUST implement `/accounts` and `/accounts/{account_id}` with create, list, get, update, and archive behavior matching OpenAPI schemas and statuses.

#### Scenario: Non-owned account access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/accounts/{account_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails

### Requirement: Categories resource behavior
The backend MUST implement `/categories` and `/categories/{category_id}` with list filters and CRUD/archive semantics.

#### Scenario: Non-owned category access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/categories/{category_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, and archive semantics including documented filters.

#### Scenario: Non-owned transaction access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/transactions/{transaction_id}` for another user's resource
- **THEN** the API SHALL return canonical `403` ProblemDetails
