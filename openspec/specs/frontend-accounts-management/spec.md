## Purpose

Define frontend behavior for accounts management presentation and shared ProblemDetails helper usage.

## Requirements

### Requirement: Accounts presentation must be user-facing and money-formatted
The frontend accounts list and mobile card views SHALL render balances using user-facing currency formatting instead of raw cents.

#### Scenario: Initial balance is rendered with currency formatting
- **WHEN** accounts are displayed in table or card views
- **THEN** `initial_balance_cents` SHALL be displayed via `formatCents(currencyCode, initial_balance_cents)`
- **AND** raw integer cents SHALL NOT be shown directly in primary balance UI.

### Requirement: Accounts ProblemDetails helper usage must be shared
Accounts frontend SHALL reuse the shared local ProblemDetails wrapper helper instead of maintaining a duplicated local implementation.

#### Scenario: Accounts page imports shared local problem helper
- **WHEN** accounts needs a local synthetic ProblemDetails error
- **THEN** it SHALL import `toLocalProblem` from `@/lib/problemDetails`
- **AND** page-local duplicate helper implementations SHALL NOT be present.
