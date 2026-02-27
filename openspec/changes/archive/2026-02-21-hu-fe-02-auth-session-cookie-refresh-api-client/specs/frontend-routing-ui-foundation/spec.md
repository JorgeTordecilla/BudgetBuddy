## MODIFIED Requirements

### Requirement: Temporary auth guard blocks private routes
Until HU-FE-02 is implemented, the auth guard MUST always treat users as unauthenticated.

#### Scenario: Guard always redirects to login in FE-01 baseline
- **WHEN** `RequireAuth` evaluates a private route in HU-FE-01
- **THEN** it SHALL use `authed = false`
- **AND** it SHALL redirect to `/login`

#### Scenario: Guard uses session-aware bootstrap in FE-02
- **WHEN** HU-FE-02 is implemented
- **THEN** `RequireAuth` SHALL evaluate auth from in-memory session state
- **AND** it SHALL attempt refresh bootstrap before redirecting unauthenticated users
- **AND** it SHALL allow private routes when refresh/bootstrap succeeds
