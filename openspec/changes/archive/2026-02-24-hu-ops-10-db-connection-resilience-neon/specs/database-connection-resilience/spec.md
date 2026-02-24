## ADDED Requirements

### Requirement: Pooled database connections are validated before use
For non-SQLite engines, pooled DB connections MUST be liveness-checked before executing statements.

#### Scenario: Stale pooled connection is transparently replaced
- **WHEN** a pooled connection is stale after provider idle/suspend behavior
- **THEN** the runtime SHALL detect invalid connection before query execution
- **AND** the request SHALL use a fresh connection without surfacing raw driver failure to clients

### Requirement: Connection recycle policy is configurable
Runtime MUST provide configuration for proactive pooled-connection recycling.

#### Scenario: Pool recycle value is operator-configurable
- **WHEN** operators set DB pool recycle configuration
- **THEN** runtime SHALL apply that value to non-SQLite DB engines
- **AND** invalid values SHALL fail startup validation

### Requirement: Transient DB connectivity failures in auth refresh are bounded and deterministic
Refresh flow MUST use bounded retry for transient DB connectivity failures and avoid leaking internal errors.

#### Scenario: First transient DB failure succeeds on retry
- **WHEN** first refresh DB read fails with transient connectivity error
- **THEN** runtime SHALL retry once
- **AND** request SHALL continue normal refresh behavior if retry succeeds

#### Scenario: Repeated transient DB failure returns canonical service-unavailable
- **WHEN** refresh DB read fails with transient connectivity error on both initial attempt and single retry
- **THEN** API SHALL return canonical `503` ProblemDetails
- **AND** response detail SHALL remain sanitized

