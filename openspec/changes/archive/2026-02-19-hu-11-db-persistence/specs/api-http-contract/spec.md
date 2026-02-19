## ADDED Requirements

### Requirement: API contract remains stable during persistence migration
Switching to DB-backed persistence MUST NOT change the public API contract.

#### Scenario: Success media type remains vendor-specific
- **WHEN** successful endpoints return JSON payloads
- **THEN** responses SHALL continue using `application/vnd.budgetbuddy.v1+json`

#### Scenario: Error payload contract remains ProblemDetails
- **WHEN** API errors are returned
- **THEN** responses SHALL continue using `application/problem+json` with canonical `ProblemDetails`

#### Scenario: Existing statuses and business conflicts are preserved
- **WHEN** requests trigger existing domain rules (archived resources, type mismatch, ownership violations, invalid cursor/range)
- **THEN** HTTP statuses and canonical `type/title/status` values SHALL remain unchanged

### Requirement: Persistence internals are transparent to API consumers
Data-layer migration details MUST remain internal and not leak into the HTTP contract.

#### Scenario: Repository implementation change does not alter response shape
- **WHEN** DB-backed repositories replace current storage paths
- **THEN** endpoint response JSON structure SHALL remain backward compatible with current OpenAPI
