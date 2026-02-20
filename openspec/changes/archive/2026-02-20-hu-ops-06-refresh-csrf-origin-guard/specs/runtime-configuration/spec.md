## ADDED Requirements

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
