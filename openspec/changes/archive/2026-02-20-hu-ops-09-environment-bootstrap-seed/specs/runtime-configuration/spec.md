## ADDED Requirements

### Requirement: Bootstrap execution is environment-safe by default
Runtime configuration MUST prevent bootstrap seeding in production unless explicitly enabled.

#### Scenario: Production bootstrap is blocked by default
- **WHEN** environment is production and bootstrap is executed without explicit override
- **THEN** runtime SHALL fail with a clear error indicating bootstrap is disabled in production

#### Scenario: Production override is explicit and deliberate
- **WHEN** environment is production and operators explicitly set bootstrap override flag
- **THEN** runtime MAY allow bootstrap execution

### Requirement: Bootstrap behavior is configurable
Runtime configuration MUST control optional demo-user and minimal-data seed behavior.

#### Scenario: Demo user creation is flag-controlled
- **WHEN** bootstrap is executed with demo-user flag enabled
- **THEN** runtime SHALL create/update demo-user state according to bootstrap policy

#### Scenario: Minimal data seed is flag-controlled
- **WHEN** bootstrap is executed with minimal-data flag enabled
- **THEN** runtime SHALL seed baseline account/category data according to bootstrap policy
