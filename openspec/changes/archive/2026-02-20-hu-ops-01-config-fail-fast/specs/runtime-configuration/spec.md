## ADDED Requirements

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
