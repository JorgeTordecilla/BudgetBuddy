## Purpose

Define ledger-side invariants for account opening balances so account creation and transaction history remain auditable and atomic.

## Requirements

### Requirement: Non-zero account opening balances SHALL be materialized in the transaction ledger
When an account is created with `initial_balance_cents != 0`, the system SHALL create a deterministic opening transaction so ledger history and account setup remain auditable from day zero.

#### Scenario: Positive opening balance creates income opening transaction
- **WHEN** `POST /accounts` succeeds with `initial_balance_cents > 0`
- **THEN** exactly one opening transaction SHALL be persisted for the same user and account
- **AND** the transaction SHALL be discoverable through `GET /transactions` using the default account/date filters.

#### Scenario: Negative opening balance creates expense opening transaction
- **WHEN** `POST /accounts` succeeds with `initial_balance_cents < 0`
- **THEN** exactly one opening transaction SHALL be persisted for the same user and account
- **AND** the transaction type/sign semantics SHALL follow domain transaction invariants.

#### Scenario: Zero opening balance does not create synthetic ledger entry
- **WHEN** `POST /accounts` succeeds with `initial_balance_cents = 0`
- **THEN** the system SHALL NOT create an opening transaction
- **AND** account creation response contract SHALL remain unchanged.

### Requirement: Opening-balance side effects SHALL be atomic with account creation
Account creation and opening-transaction creation SHALL succeed or fail as one unit.

#### Scenario: Opening transaction failure aborts account creation
- **WHEN** the opening transaction cannot be persisted during `POST /accounts`
- **THEN** account creation SHALL be rolled back
- **AND** the API SHALL return canonical `application/problem+json` semantics for the failing operation.
