## Purpose
Define shared frontend rules for currency-aware money input and display, ensuring major-unit UX with integer-cents API safety.

## Requirements

### Requirement: Frontend money input/display contract is currency-aware and deterministic
The frontend MUST provide a shared money UX contract that accepts major-unit user input, formats values using user currency, and preserves integer-cents API safety.

#### Scenario: Major-unit input is converted to cents deterministically
- **WHEN** a user enters a money amount in a supported base currency (`USD`, `COP`, `EUR`, `MXN`)
- **THEN** the frontend SHALL convert the value to integer cents deterministically before API submission
- **AND** invalid or ambiguous values SHALL be rejected with inline validation.

#### Scenario: Display formatting uses session currency context
- **WHEN** money values are rendered in cards, tables, or summaries
- **THEN** frontend SHALL format cents using authenticated user `currency_code`
- **AND** SHALL avoid raw cents rendering in user-facing primary value fields.

#### Scenario: Contract payload remains integer cents
- **WHEN** money mutations are sent to backend endpoints
- **THEN** payload fields (`amount_cents`, `expected_amount_cents`, `limit_cents`) SHALL remain integer cents
- **AND** no API contract shape change SHALL be introduced.

#### Scenario: Shared utility is reused across money surfaces
- **WHEN** transactions, income sources, budgets, analytics, savings, and bills money UI is implemented
- **THEN** frontend SHALL use shared parse/format helpers (including prefill conversion helpers where applicable)
- **AND** page-local ad-hoc money conversion logic SHALL be avoided.

#### Scenario: Savings and bills forms avoid raw cents exposure
- **WHEN** savings goal target, contribution amount, bills budget, or bill-pay modal amount is rendered/editable
- **THEN** UX SHALL use major-unit values for user input/prefill
- **AND** integer cents SHALL remain an API-boundary concern only.
