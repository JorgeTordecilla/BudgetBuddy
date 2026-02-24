## ADDED Requirements

### Requirement: DB pool resilience configuration is validated at startup
The service MUST validate DB pool resilience runtime configuration at startup and refuse invalid values.

#### Scenario: DB pool resilience settings are validated
- **WHEN** `DB_POOL_PRE_PING` and `DB_POOL_RECYCLE_SECONDS` are configured
- **THEN** startup SHALL validate values
- **AND** invalid recycle values SHALL fail startup with clear configuration errors
