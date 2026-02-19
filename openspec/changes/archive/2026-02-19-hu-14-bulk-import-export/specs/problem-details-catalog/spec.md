## ADDED Requirements

### Requirement: Import validation errors are canonical
The ProblemDetails catalog MUST include canonical entries for bulk import request validation and negotiation failures.

#### Scenario: Catalog includes import batch limit validation
- **WHEN** bulk import exceeds the configured maximum batch size
- **THEN** the catalog SHALL define a canonical `400` entry with stable `type`, `title`, and `status` values

#### Scenario: Catalog includes import negotiation failure mapping
- **WHEN** bulk import request negotiation fails for `Accept` or `Content-Type`
- **THEN** the catalog SHALL document canonical `400/406` mapping with stable `type`, `title`, and `status` values

### Requirement: Import row-level failures map to canonical problem identities
Bulk import row-level failures MUST map known domain conflicts to canonical problem identities and sanitized client-safe messages.

#### Scenario: Import row conflict includes canonical problem identity
- **WHEN** an imported row fails with known domain conflicts (ownership, archived resource, category/type mismatch, money invariants)
- **THEN** row failure payload SHALL include canonical problem identity fields suitable for deterministic client handling

#### Scenario: Unknown internal failures remain sanitized
- **WHEN** an imported row fails for internal reasons not mapped to a known canonical problem
- **THEN** row failure payload SHALL use a sanitized client-safe message and SHALL NOT leak stack traces or persistence internals
