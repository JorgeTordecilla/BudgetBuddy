## ADDED Requirements

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
