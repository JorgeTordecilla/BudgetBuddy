## MODIFIED Requirements

### Requirement: Canonical error mapping and responsive behavior are preserved
Savings UI MUST respect canonical ProblemDetails handling and mobile layout constraints.

#### Scenario: Delete contribution failure is surfaced to the user
- **WHEN** deleting a contribution fails (for example mutation rejection or ProblemDetails error)
- **THEN** frontend SHALL capture the error in page/form problem state instead of letting it propagate uncaught
- **AND** user SHALL see deterministic error feedback consistent with existing savings mutation handlers.
