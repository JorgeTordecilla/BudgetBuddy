## Purpose

Define standard liveness and readiness probes for infrastructure orchestration and traffic routing.

## Requirements

### Requirement: Liveness endpoint is process-only
The API SHALL expose a liveness endpoint that confirms process health without checking external dependencies.

#### Scenario: Liveness is available while process is alive
- **WHEN** a client sends `GET /healthz`
- **THEN** the API SHALL return `200`
- **AND** the response body SHALL include `status` and `version`
- **AND** the endpoint SHALL NOT perform database access

#### Scenario: Liveness includes request correlation header
- **WHEN** a client sends `GET /healthz`
- **THEN** the response SHALL include `X-Request-Id`

### Requirement: Readiness endpoint reflects dependency availability
The API SHALL expose a readiness endpoint that reports whether the service can safely receive traffic.

#### Scenario: Readiness succeeds when dependencies are ready
- **WHEN** a client sends `GET /readyz` and required dependencies are healthy
- **THEN** the API SHALL return `200`
- **AND** the response body SHALL include `status` and `version`
- **AND** readiness checks SHALL include database connectivity

#### Scenario: Readiness fails when dependencies are unavailable
- **WHEN** a client sends `GET /readyz` and a required readiness check fails
- **THEN** the API SHALL return `503`
- **AND** the response body SHALL indicate `status=not_ready`

#### Scenario: Readiness schema-check integration is optional
- **WHEN** schema/migration readiness checks are not configured
- **THEN** `GET /readyz` SHALL still evaluate database connectivity
- **AND** response checks MAY report schema status as `skip`

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

### Requirement: Probe responses are operator-friendly
Probe endpoints SHALL provide simple JSON and deterministic fields for infrastructure automation.

#### Scenario: Probe payload remains minimal and stable
- **WHEN** clients call `GET /healthz` or `GET /readyz`
- **THEN** probe payloads SHALL remain compact and include only operational fields needed for orchestration

### Requirement: Operations documentation includes probe usage
Operational documentation SHALL include runnable examples for health and readiness probes.

#### Scenario: Docs provide curl examples
- **WHEN** operators review deployment documentation
- **THEN** they SHALL find curl examples for `GET /healthz` and `GET /readyz`

#### Scenario: Docs include migration deploy and mismatch diagnosis
- **WHEN** operators review deployment documentation
- **THEN** docs SHALL include `alembic upgrade head` as deployment baseline
- **AND** docs SHALL include revision mismatch diagnosis steps (for example `alembic current` and `alembic heads`)
