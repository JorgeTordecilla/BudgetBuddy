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
