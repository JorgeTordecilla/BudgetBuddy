## ADDED Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions page for authenticated users under the private app shell.

#### Scenario: Route is available under app shell
- **WHEN** an authenticated user navigates to `/app/transactions`
- **THEN** the transactions page SHALL render within `AppShell`
- **AND** unauthenticated access SHALL follow existing auth guard behavior.

#### Scenario: Transactions list uses contract headers and supports cursor pagination
- **WHEN** the transactions page fetches list data
- **THEN** it SHALL call `GET /transactions` with vendor `Accept` header and auth context
- **AND** it SHALL support cursor-based pagination using `next_cursor`.

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

### Requirement: Transaction soft-delete lifecycle must be supported
The frontend SHALL support archive and restore actions through contract-defined endpoints.

#### Scenario: Archive transaction
- **WHEN** user confirms archive action for an active transaction
- **THEN** frontend SHALL call `DELETE /transactions/{transaction_id}`
- **AND** success `204` SHALL remove the item from active list (or update archived state in archived view).

#### Scenario: Restore archived transaction
- **WHEN** user triggers restore on an archived transaction
- **THEN** frontend SHALL call `PATCH /transactions/{transaction_id}` with `{ "archived_at": null }`
- **AND** the transaction SHALL return to active state in UI after successful response.

### Requirement: Transaction ProblemDetails handling must be deterministic
The frontend SHALL parse `application/problem+json` and provide canonical status/type-specific feedback.

#### Scenario: Canonical status handling
- **WHEN** transactions API returns `400`, `401`, `403`, `406`, or `409`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** present deterministic user-facing feedback for each status class.

#### Scenario: Category type mismatch conflict is mapped explicitly
- **WHEN** API returns `409` with ProblemDetails type for `category-type-mismatch`
- **THEN** frontend SHALL show a specific message explaining transaction type/category type mismatch.

### Requirement: Transactions page must reuse global frontend quality standards
The transactions experience SHALL follow the established frontend policy for state handling, accessibility, responsiveness, and verification.

#### Scenario: Page states and accessibility are explicit
- **WHEN** the page is rendered or mutated
- **THEN** loading, empty, success, and error states SHALL be explicit
- **AND** interactive controls/dialogs SHALL remain keyboard-accessible.

#### Scenario: Quality gates are executed
- **WHEN** implementation is verified
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass
- **AND** coverage SHALL meet project frontend thresholds.
