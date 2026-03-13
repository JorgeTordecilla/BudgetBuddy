## Purpose

Define frontend behavior for accounts management presentation and shared ProblemDetails helper usage.

## Requirements

### Requirement: Accounts presentation must be user-facing and money-formatted
The frontend accounts list and mobile card views SHALL render balances using user-facing currency formatting instead of raw cents.

#### Scenario: Initial balance is rendered with currency formatting
- **WHEN** accounts are displayed in table or card views
- **THEN** `initial_balance_cents` SHALL be displayed via `formatCents(currencyCode, initial_balance_cents)`
- **AND** raw integer cents SHALL NOT be shown directly in primary balance UI.

#### Scenario: Accounts form input is major-unit user-facing
- **WHEN** user opens Accounts create/edit modal
- **THEN** initial balance input SHALL accept/display major money units (for example `10.50`)
- **AND** submission SHALL convert value to `initial_balance_cents` payload deterministically.

#### Scenario: Accounts edit prefill does not expose raw cents
- **WHEN** user opens edit modal for an existing account
- **THEN** form prefill SHALL show user-facing major-unit value
- **AND** raw integer cents SHALL NOT be displayed in the editable amount input.

#### Scenario: Accounts modal helper copy matches user-facing semantics
- **WHEN** accounts modal is rendered
- **THEN** helper/description text SHALL describe user-facing money input semantics
- **AND** it SHALL NOT instruct users to enter backend raw cents invariants.

#### Scenario: Initial balance parser handles locale decimal separators without inflation
- **WHEN** user enters locale-formatted values such as `1,00`, `1.00`, or grouped variants in the initial balance field
- **THEN** the parser SHALL normalize those inputs to the same major-unit amount
- **AND** generated `initial_balance_cents` SHALL not be inflated by separator interpretation.

#### Scenario: Ambiguous or invalid initial balance input is rejected with canonical inline error
- **WHEN** the initial balance field contains a malformed money value
- **THEN** the UI SHALL block submit
- **AND** SHALL surface deterministic inline problem feedback consistent with existing ProblemDetails-aware UX.

### Requirement: Accounts ProblemDetails helper usage must be shared
Accounts frontend SHALL reuse the shared local ProblemDetails wrapper helper instead of maintaining a duplicated local implementation.

#### Scenario: Accounts page imports shared local problem helper
- **WHEN** accounts needs a local synthetic ProblemDetails error
- **THEN** it SHALL import `toLocalProblem` from `@/lib/problemDetails`
- **AND** page-local duplicate helper implementations SHALL NOT be present.

#### Scenario: Accounts modal handlers use stable callback pattern
- **WHEN** create/edit modal open handlers are referenced by effects or memoized children
- **THEN** handlers SHALL use stable callback references
- **AND** behavior SHALL remain equivalent to current UX flow.

#### Scenario: Frontend test files are UTF-8 without BOM
- **WHEN** frontend tests are committed
- **THEN** files SHALL not include UTF-8 BOM prefix
- **AND** tooling/lint behavior SHALL remain deterministic across environments.
