## MODIFIED Requirements

### Requirement: Canonical ProblemDetails examples are reusable
The ProblemDetails catalog MUST provide reusable canonical examples for `400`, `401`, `403`, `406`, `409`, and `429`, and those examples MUST be referenceable from endpoint responses without semantic drift.

#### Scenario: Canonical example coverage includes required statuses
- **WHEN** the OpenAPI catalog is reviewed
- **THEN** canonical examples SHALL exist for `400`, `401`, `403`, `406`, `409`, and `429`

#### Scenario: Canonical examples use stable identity fields
- **WHEN** canonical error examples are defined
- **THEN** each example SHALL include stable `type`, `title`, and `status` values aligned with runtime helpers

#### Scenario: Endpoint responses reference canonical examples consistently
- **WHEN** endpoint `application/problem+json` responses are reviewed
- **THEN** mapped examples SHALL reference or mirror catalog canonical identities with no mismatch between response meaning and example identity

## ADDED Requirements

### Requirement: Canonical 400 variants are distinguished by use-case
The catalog and response mappings MUST keep `invalid-cursor` and `invalid-date-range` as distinct canonical 400 identities with non-overlapping endpoint usage.

#### Scenario: Invalid cursor identity is limited to cursor parsing failures
- **WHEN** cursor decoding/shape validation fails
- **THEN** the response example SHALL use canonical invalid-cursor identity only

#### Scenario: Invalid date range identity is limited to from/to validation failures
- **WHEN** request date bounds are invalid (including `from > to`)
- **THEN** the response example SHALL use canonical invalid-date-range identity only

### Requirement: Canonical 409 examples are grouped by domain rule
Conflict examples MUST be cataloged and mapped by domain-specific business rules.

#### Scenario: Transaction conflict identities remain distinct
- **WHEN** conflict examples for transactions are documented
- **THEN** cataloged/mapped examples SHALL preserve distinct canonical identities for archived account, archived category, and category-type mismatch

#### Scenario: Budget conflict identities remain distinct
- **WHEN** conflict examples for budgets are documented
- **THEN** cataloged/mapped examples SHALL preserve distinct canonical identities for duplicate budget and category-availability ownership constraints
