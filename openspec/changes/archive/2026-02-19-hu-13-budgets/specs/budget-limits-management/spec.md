## ADDED Requirements

### Requirement: Budget resource CRUD and archive behavior
The backend MUST implement `/budgets` and `/budgets/{budget_id}` with create, list-by-range, get, patch, and archive semantics aligned with OpenAPI schemas and statuses.

#### Scenario: Create budget succeeds for owned active category
- **WHEN** an authenticated user calls `POST /budgets` with valid `month`, `category_id`, and `limit_cents` for a category owned by that user and not archived
- **THEN** the API SHALL return `201` with `Content-Type: application/vnd.budgetbuddy.v1+json` and a `Budget` payload

#### Scenario: List budgets by month range
- **WHEN** an authenticated user calls `GET /budgets` with valid `from` and `to` month query parameters
- **THEN** the API SHALL return `200` with `BudgetListResponse` scoped to that user and filtered to the requested month range

#### Scenario: Get owned budget
- **WHEN** an authenticated user calls `GET /budgets/{budget_id}` for a budget owned by that user
- **THEN** the API SHALL return `200` with a `Budget` payload

#### Scenario: Patch budget limit or month
- **WHEN** an authenticated user calls `PATCH /budgets/{budget_id}` with valid mutable fields for an owned budget
- **THEN** the API SHALL return `200` with updated `Budget` payload

#### Scenario: Archive budget
- **WHEN** an authenticated user calls `DELETE /budgets/{budget_id}` for an owned active budget
- **THEN** the API SHALL archive the budget and return `204` with no response body

### Requirement: Budget domain invariants
Budget writes MUST enforce deterministic invariants for month format, money representation, and uniqueness.

#### Scenario: Month format must be canonical
- **WHEN** `POST /budgets` or `PATCH /budgets/{budget_id}` receives a `month` value that is not in `YYYY-MM` format
- **THEN** the API SHALL return canonical validation `400` ProblemDetails

#### Scenario: limit_cents must be integer and positive
- **WHEN** `POST /budgets` or `PATCH /budgets/{budget_id}` receives non-integer, zero, or negative `limit_cents`
- **THEN** the API SHALL return canonical validation `400` ProblemDetails

#### Scenario: Duplicate monthly category budget is rejected
- **WHEN** a user attempts to create or update a budget such that `(user_id, month, category_id)` duplicates an existing active budget
- **THEN** the API SHALL return canonical `409` ProblemDetails for duplicate budget

### Requirement: Budget ownership, category checks, and media-type policy
Budget endpoints MUST enforce auth/ownership and return canonical negotiation and conflict errors.

#### Scenario: Budget endpoint without token is unauthorized
- **WHEN** a protected budget endpoint is called without a valid access token
- **THEN** the API SHALL return canonical `401` ProblemDetails

#### Scenario: Non-owned budget access is forbidden
- **WHEN** an authenticated user calls `GET`, `PATCH`, or `DELETE` on `/budgets/{budget_id}` for another user's budget
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Unsupported Accept header on budget endpoint
- **WHEN** a budget endpoint receives an `Accept` header that does not allow the contract media types
- **THEN** the API SHALL return canonical `406` ProblemDetails

#### Scenario: Budget category is not owned by user
- **WHEN** a budget write references a category that is not owned by the authenticated user
- **THEN** the API SHALL return canonical `409` ProblemDetails for category ownership conflict

#### Scenario: Budget category is archived
- **WHEN** a budget write references a category whose `archived_at` is not null
- **THEN** the API SHALL return canonical `409` ProblemDetails for archived category conflict
