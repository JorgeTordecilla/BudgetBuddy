## MODIFIED Requirements

### Requirement: Transaction create and update flows must follow contract
The frontend SHALL support creating and updating transactions with deterministic payload and response handling.

#### Scenario: Create transaction submits valid payload
- **WHEN** user submits the create form with valid fields
- **THEN** frontend SHALL call `POST /transactions` using vendor media type
- **AND** on success the list SHALL refresh to include the new transaction.

#### Scenario: Update transaction submits partial payload
- **WHEN** user edits an existing transaction
- **THEN** frontend SHALL call `PATCH /transactions/{transaction_id}` with only changed fields
- **AND** on success the list SHALL reflect updated values.

#### Scenario: Transaction form accepts major-unit amount input
- **WHEN** user enters amount using major currency units in create or edit flow
- **THEN** frontend SHALL parse and validate the value using user `currency_code`
- **AND** SHALL send `amount_cents` as integer cents in request payload.

#### Scenario: Transaction invalid amount feedback is field-level and deterministic
- **WHEN** amount input cannot be parsed into a valid positive cents integer
- **THEN** frontend SHALL block submission
- **AND** SHALL show inline deterministic validation guidance for the amount field.
