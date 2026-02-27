## MODIFIED Requirements

### Requirement: Global frontend error mapping must remain deterministic
The frontend SHALL keep centralized mapping from ProblemDetails to user-visible error UX across all routes and auth flows.

#### Scenario: Session-expired auth failures follow mapped UX policy
- **WHEN** refresh flow returns ProblemDetails with unauthorized or forbidden auth types
- **THEN** frontend SHALL render deterministic mapped messaging
- **AND** request-id visibility/copy behavior SHALL remain available in the error presentation path.
