## MODIFIED Requirements

### Requirement: Frontend deploy must provide baseline smoke coverage
The frontend repository SHALL provide smoke tests that validate login and authenticated navigation baseline for release promotion decisions.

#### Scenario: Auth smoke flow includes dashboard and analytics navigation
- **WHEN** smoke suite runs with valid credentials
- **THEN** it SHALL validate login success and navigation to `/app/dashboard`
- **AND** it SHALL validate navigation/loading for `/app/analytics`.

#### Scenario: Logout smoke flow is validated
- **WHEN** authenticated smoke flow executes logout
- **THEN** frontend SHALL return to login route
- **AND** protected route revisit SHALL require re-authentication.

#### Scenario: Smoke checks participate in release gate
- **WHEN** CI pipeline evaluates production promotion criteria
- **THEN** smoke test results SHALL be part of gate policy
- **AND** failed smoke checks SHALL block release promotion for protected branches/environments.
