## Purpose
Define backend requirements for user-scoped income-source CRUD behavior and deterministic income-source invariants.

## Requirements
### Requirement: Income sources CRUD is user-scoped and archive-aware
The backend MUST implement `/income-sources` and `/income-sources/{income_source_id}` with create, list, get, patch, and archive behavior scoped to the authenticated user.

#### Scenario: Create income source
- **WHEN** an authenticated user posts valid source payload
- **THEN** the API SHALL return `201` with `IncomeSourceOut`

#### Scenario: List income sources
- **WHEN** an authenticated user calls `GET /income-sources`
- **THEN** the API SHALL return `200` with `IncomeSourceListOut` containing only that user's sources

#### Scenario: Get owned income source
- **WHEN** an authenticated user calls `GET /income-sources/{income_source_id}` for an owned source
- **THEN** the API SHALL return `200` with `IncomeSourceOut`

#### Scenario: Patch income source
- **WHEN** an authenticated user calls `PATCH /income-sources/{income_source_id}` with valid updates
- **THEN** the API SHALL return `200` with updated `IncomeSourceOut`

#### Scenario: Archive income source
- **WHEN** an authenticated user calls `DELETE /income-sources/{income_source_id}`
- **THEN** the API SHALL soft-archive the resource and return `204` with no response body

#### Scenario: Ownership is enforced for item endpoints
- **WHEN** a user accesses a non-owned source on `GET`, `PATCH`, or `DELETE`
- **THEN** the API SHALL return canonical `403` ProblemDetails

### Requirement: Income source domain invariants are explicit
Income sources MUST preserve deterministic naming and money invariants.

#### Scenario: Duplicate source name conflicts per user
- **WHEN** a user creates or renames a source to a name that already exists in that user's active source set
- **THEN** the API SHALL return `409` as ProblemDetails

#### Scenario: Expected income uses integer cents
- **WHEN** source payload is validated
- **THEN** `expected_amount_cents` SHALL be validated as integer cents under existing money safety bounds

#### Scenario: Frequency enum is monthly-only in phase one
- **WHEN** a client submits source frequency
- **THEN** accepted value set SHALL be restricted to `monthly` for this change
