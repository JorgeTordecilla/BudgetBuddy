## ADDED Requirements

### Requirement: Heavy transaction endpoints expose canonical throttling contract
The HTTP contract MUST define deterministic throttling behavior for import/export endpoints.

#### Scenario: Import endpoint documents canonical 429
- **WHEN** `POST /transactions/import` is reviewed in OpenAPI
- **THEN** it SHALL include `429` with `application/problem+json` and `Retry-After` header

#### Scenario: Export endpoint documents canonical 429
- **WHEN** `GET /transactions/export` is reviewed in OpenAPI
- **THEN** it SHALL include `429` with `application/problem+json` and `Retry-After` header

#### Scenario: Throttling identity remains canonical across endpoints
- **WHEN** any rate-limited endpoint returns `429`
- **THEN** `type`, `title`, and `status` SHALL match canonical rate-limited ProblemDetails identity
