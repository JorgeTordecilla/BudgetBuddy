## MODIFIED Requirements

### Requirement: OpenAPI operations include success and error examples
The OpenAPI contract MUST provide at least one success example and one error example per documented operation, and every `application/problem+json` example MUST match the canonical ProblemDetails identity for that specific response mapping.

#### Scenario: Success example is present for response body operations
- **WHEN** an operation returns a successful response body
- **THEN** the corresponding success response content SHALL include at least one example matching schema and vendor media type

#### Scenario: Error example is present for operation error mapping
- **WHEN** an operation documents one or more error statuses
- **THEN** at least one documented error response SHALL include a ProblemDetails example matching canonical media type

#### Scenario: Response-level ProblemDetails examples are semantically correct
- **WHEN** an operation response documents `application/problem+json` examples
- **THEN** the example SHALL match the declared response semantics and canonical `type/title/status` for that endpoint/status pair

## ADDED Requirements

### Requirement: Invalid cursor and invalid date range examples are context-specific
OpenAPI list endpoint responses MUST not cross-map cursor and date-range ProblemDetails examples.

#### Scenario: Invalid cursor example appears only on cursor error mappings
- **WHEN** list endpoints document `400` invalid cursor behavior
- **THEN** the mapped ProblemDetails example SHALL use canonical invalid-cursor identity and SHALL NOT use invalid-date-range examples

#### Scenario: Invalid date range example appears only on date-range validation mappings
- **WHEN** endpoints document `from/to` date-range validation failures
- **THEN** the mapped ProblemDetails example SHALL use canonical invalid-date-range identity and SHALL NOT use invalid-cursor examples

### Requirement: Domain conflict examples are operation-appropriate
OpenAPI `409` examples MUST reflect the concrete business conflict(s) applicable to each operation.

#### Scenario: Transaction conflict examples are canonical and conflict-specific
- **WHEN** `POST /transactions` or `PATCH /transactions/{transaction_id}` documents `409`
- **THEN** mapped examples SHALL be limited to canonical transaction conflicts (`account-archived`, `category-archived`, `category-type-mismatch`) relevant to that operation

#### Scenario: Budget conflict examples are canonical and conflict-specific
- **WHEN** budget write operations document `409`
- **THEN** mapped examples SHALL be limited to canonical budget conflicts (including duplicate key and archived/non-owned category conflicts) relevant to that operation

### Requirement: Throttled auth responses document retry header behavior
OpenAPI auth responses that declare `429` MUST document client-visible retry guidance.

#### Scenario: 429 includes Retry-After header documentation
- **WHEN** `POST /auth/login` or `POST /auth/refresh` defines `429`
- **THEN** the response SHALL document `Retry-After` header behavior for clients
