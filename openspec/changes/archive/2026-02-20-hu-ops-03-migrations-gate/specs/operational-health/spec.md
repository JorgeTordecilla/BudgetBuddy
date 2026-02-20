## MODIFIED Requirements

### Requirement: Readiness endpoint reflects dependency availability
The API SHALL expose a readiness endpoint that reports whether the service can safely receive traffic.

#### Scenario: Readiness fails on schema mismatch in strict mode
- **WHEN** `MIGRATIONS_STRICT=true` and DB revision is not at migration head
- **THEN** `GET /readyz` SHALL return `503`
- **AND** readiness payload SHALL indicate schema check failure

#### Scenario: Readiness remains DB-driven when strict mode is disabled
- **WHEN** `MIGRATIONS_STRICT=false` and DB connectivity is healthy
- **THEN** `GET /readyz` SHALL remain eligible to return `200` even if migration head is not matched
- **AND** readiness payload MAY include non-failing schema status information

#### Scenario: Readiness logs revision diagnostics
- **WHEN** migration-gate checks run
- **THEN** logs SHALL include `db_revision`, `head_revision`, and `migrations_strict`

### Requirement: Operations documentation includes probe usage
Operational documentation SHALL include runnable examples for health and readiness probes.

#### Scenario: Docs include migration deploy and mismatch diagnosis
- **WHEN** operators review deployment documentation
- **THEN** docs SHALL include `alembic upgrade head` as deployment baseline
- **AND** docs SHALL include revision mismatch diagnosis steps (for example `alembic current` and `alembic heads`)
