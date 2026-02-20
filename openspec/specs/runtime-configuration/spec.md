## Purpose

Define and enforce runtime configuration safety rules so the service fails fast on invalid or insecure startup configuration.

## Requirements

### Requirement: Critical runtime configuration is fail-fast
The service MUST validate critical configuration at startup and refuse to start when required values are missing or invalid.

#### Scenario: Missing required configuration aborts startup
- **WHEN** a required variable such as `DATABASE_URL` or `JWT_SECRET` is missing
- **THEN** process initialization SHALL fail with a clear error naming the missing setting

#### Scenario: Refresh-cookie settings are validated when enabled
- **WHEN** refresh-cookie auth is enabled
- **THEN** required refresh-cookie configuration SHALL be validated at startup and invalid/missing values SHALL abort startup

### Requirement: Production mode rejects insecure settings
In production, startup validation MUST reject insecure runtime combinations.

#### Scenario: Production rejects debug mode
- **WHEN** environment is production and debug mode is enabled
- **THEN** startup SHALL fail with a clear configuration error

#### Scenario: Production rejects wildcard CORS origins
- **WHEN** environment is production and `BUDGETBUDDY_CORS_ORIGINS` contains `*`
- **THEN** startup SHALL fail with a clear configuration error

#### Scenario: Cookie security flags are coherence-validated
- **WHEN** refresh cookie uses `SameSite=None` with `Secure=false`
- **THEN** startup SHALL fail with a clear configuration error

### Requirement: Startup configuration logging does not leak secrets
Startup logs MUST confirm configuration load without printing secret values.

#### Scenario: Config-loaded log redacts secret-bearing fields
- **WHEN** application starts successfully
- **THEN** logs MAY include non-sensitive operational metadata, and SHALL NOT include raw secrets such as JWT or refresh-token secrets

### Requirement: Deployment documentation reflects runtime config contract
Deployment documentation MUST list required variables and fail-fast rules.

#### Scenario: Deployment guide includes required vars and production constraints
- **WHEN** `DEPLOYMENT.md` is reviewed
- **THEN** it SHALL document required environment variables, production-only constraints, and expected startup failure behavior

#### Scenario: Deployment runbook includes prechecks and migration step
- **WHEN** operators prepare a production deployment
- **THEN** `DEPLOYMENT.md` SHALL include prechecks for required environment variables and DB connectivity
- **AND** deployment steps SHALL include `alembic upgrade head`

#### Scenario: Deployment runbook defines reproducible smoke test
- **WHEN** deployment is completed
- **THEN** `DEPLOYMENT.md` SHALL define a smoke-test sequence that validates auth login and authenticated `/me`
- **AND** the sequence SHALL be executable in approximately five minutes

#### Scenario: Deployment runbook defines rollback paths
- **WHEN** incidents require rollback
- **THEN** `DEPLOYMENT.md` SHALL define a reversible-migration rollback path using Alembic downgrade
- **AND** SHALL define an alternative backup/snapshot restore path for non-reversible migrations

### Requirement: Refresh origin guard configuration is explicit and validated
Runtime configuration MUST expose explicit settings for refresh-origin policy and missing-origin behavior.

#### Scenario: Refresh origin allowlist is configurable
- **WHEN** operators configure `AUTH_REFRESH_ALLOWED_ORIGINS`
- **THEN** refresh origin guard SHALL use that allowlist for `POST /auth/refresh`
- **AND** default behavior MAY derive from `BUDGETBUDDY_CORS_ORIGINS` when not explicitly set

#### Scenario: Missing-origin mode is configurable
- **WHEN** operators configure `AUTH_REFRESH_MISSING_ORIGIN_MODE`
- **THEN** accepted values SHALL be `deny` or `allow_trusted`
- **AND** invalid values SHALL fail startup with a clear configuration error

#### Scenario: Production default is secure
- **WHEN** environment is production and missing-origin mode is not explicitly set
- **THEN** runtime SHALL default refresh missing-origin behavior to `deny`

### Requirement: Rate-limit configuration covers auth and heavy transaction endpoints
Runtime configuration MUST expose endpoint-specific rate-limit controls for auth and heavy transaction operations.

#### Scenario: Import/export limits are configurable
- **WHEN** operators configure `TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE` and `TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE`
- **THEN** runtime SHALL apply those thresholds to import/export throttling checks

#### Scenario: Invalid rate-limit configuration fails fast
- **WHEN** any configured rate-limit threshold is invalid (for example non-numeric or less than 1)
- **THEN** startup SHALL fail with clear configuration error naming the invalid setting

### Requirement: Production CORS configuration is strict and explicit
Runtime configuration MUST enforce strict CORS origin policy in production environments.

#### Scenario: Production rejects permissive wildcard origin
- **WHEN** environment is production and CORS origins contain `*`
- **THEN** startup SHALL fail with a clear configuration error

#### Scenario: CORS origins are environment-driven allowlist
- **WHEN** operators configure CORS origins for an environment
- **THEN** runtime SHALL use that explicit allowlist for CORS enforcement

### Requirement: Security header policy is deterministic
Runtime behavior MUST apply a consistent baseline security-header policy across API responses.

#### Scenario: Header policy is applied without endpoint-specific drift
- **WHEN** API responses are emitted across different routers/status codes
- **THEN** baseline security headers SHALL be consistently present according to policy

#### Scenario: Header policy is documented for operations and support
- **WHEN** deployment/operational documentation is reviewed
- **THEN** it SHALL explicitly describe which security headers are enforced and why
