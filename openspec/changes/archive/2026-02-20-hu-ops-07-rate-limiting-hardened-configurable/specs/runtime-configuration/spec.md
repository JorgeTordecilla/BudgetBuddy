## ADDED Requirements

### Requirement: Rate-limit configuration covers auth and heavy transaction endpoints
Runtime configuration MUST expose endpoint-specific rate-limit controls for auth and heavy transaction operations.

#### Scenario: Import/export limits are configurable
- **WHEN** operators configure `TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE` and `TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE`
- **THEN** runtime SHALL apply those thresholds to import/export throttling checks

#### Scenario: Invalid rate-limit configuration fails fast
- **WHEN** any configured rate-limit threshold is invalid (for example non-numeric or less than 1)
- **THEN** startup SHALL fail with clear configuration error naming the invalid setting
