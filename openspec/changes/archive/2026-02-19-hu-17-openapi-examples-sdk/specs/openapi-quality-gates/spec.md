## ADDED Requirements

### Requirement: CI validates OpenAPI contract syntax
Continuous integration MUST validate `backend/openapi.yaml` before merge.

#### Scenario: Invalid OpenAPI fails CI
- **WHEN** the OpenAPI file is syntactically or structurally invalid
- **THEN** CI SHALL fail with a deterministic validation error

### Requirement: CI enforces SDK up-to-date state
Continuous integration MUST fail if generated SDK artifacts differ from repository state.

#### Scenario: Stale generated SDK fails build
- **WHEN** OpenAPI or generation templates change without committing regenerated SDK outputs
- **THEN** CI SHALL fail using a diff-based check

#### Scenario: Freshly generated SDK passes build
- **WHEN** SDK generation is run and outputs are committed
- **THEN** CI SHALL pass generation consistency checks
