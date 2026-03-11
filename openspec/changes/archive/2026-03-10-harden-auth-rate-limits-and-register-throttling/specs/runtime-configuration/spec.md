## MODIFIED Requirements

### Requirement: Auth throttling configuration is explicit and environment-driven
The backend MUST expose auth rate-limiting controls through explicit environment-based runtime configuration.

#### Scenario: Register rate limit is configurable
- **WHEN** runtime configuration is loaded
- **THEN** the backend SHALL read `AUTH_REGISTER_RATE_LIMIT_PER_MINUTE`
- **AND** it SHALL apply a default value of `5` when the variable is not explicitly set

#### Scenario: Register throttling configuration is safe to log
- **WHEN** safe configuration fields are emitted for diagnostics
- **THEN** register rate-limit configuration SHALL be represented in non-secret diagnostic output without exposing sensitive material
