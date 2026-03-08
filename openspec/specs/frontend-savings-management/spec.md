## Purpose

Define frontend behavior for savings-goals UI, including route integration, progress display, actions, and error handling.
## Requirements
### Requirement: Savings route is available under authenticated AppShell
The frontend MUST expose `/app/savings` under the existing auth guard and AppShell navigation.

#### Scenario: Authenticated navigation renders savings page
- **WHEN** authenticated user navigates to `/app/savings`
- **THEN** savings UI renders with nav active.

#### Scenario: Unauthenticated navigation is blocked
- **WHEN** unauthenticated access targets `/app/savings`
- **THEN** existing auth guard behavior is applied.

### Requirement: Savings list shows progress, status badges, and filters
Savings list MUST render progress and lifecycle state clearly with status filter controls.

#### Scenario: Goal cards display progress details
- **WHEN** `GET /savings-goals` returns data
- **THEN** each goal shows name, progress bar, `saved/target`, `remaining`, optional deadline, and status badge.

#### Scenario: Status badges follow frontend-local deadline rules
- **WHEN** goal is `active`
- **THEN** badge is `Active`, `Due soon` (<=30 days), or `Overdue` based on local-device date vs deadline.
- **AND WHEN** status is `completed` or `cancelled`
- **THEN** badge maps to corresponding terminal label.

#### Scenario: Status filter drives API refetch
- **WHEN** user selects `All/Active/Completed/Cancelled`
- **THEN** frontend calls `GET /savings-goals?status=<value>` and refreshes list.

### Requirement: Savings page includes KPI summary
The page MUST render summary KPIs from `/savings-goals/summary`.

#### Scenario: Summary KPIs render from API response
- **WHEN** summary request succeeds
- **THEN** UI shows `Active goals`, `Total saved`, `Total remaining`, and `Overall progress %`.

### Requirement: Goal form enforces target/deadline/category constraints
Create/edit forms MUST enforce client validations aligned with backend rules while preserving major-unit money UX.

#### Scenario: Target validation blocks invalid submit
- **WHEN** `target_cents <= 0`
- **THEN** submit is blocked with inline validation.

#### Scenario: Target validation parses major units and blocks invalid submit
- **WHEN** user enters target amount in goal form
- **THEN** frontend SHALL parse the field as major-unit money input and convert to integer cents before submit
- **AND** invalid money input SHALL be blocked with inline validation
- **AND** value `0` or negative SHALL be rejected deterministically.

#### Scenario: Goal form prefill shows user-facing major units
- **WHEN** edit modal opens for an existing goal
- **THEN** `target_cents` SHALL be prefilled as major-unit input value (for example `5000` cents -> `50.00` equivalent)
- **AND** form field SHALL NOT expose raw cents to the user.

#### Scenario: Past deadline validation blocks invalid submit
- **WHEN** deadline is before local today
- **THEN** submit is blocked with inline validation.

#### Scenario: Category selector is expense-only
- **WHEN** selecting goal category
- **THEN** only expense categories are selectable.

### Requirement: Contribution and status actions update UI without full reload
Contribution add/delete and complete/cancel actions MUST update progress/status reactively and surface errors in the correct context.

#### Scenario: Add contribution updates progress and can auto-complete badge
- **WHEN** add contribution succeeds on active goal
- **THEN** progress and totals refresh and badge may switch to `Completed`.

#### Scenario: Delete contribution recalculates progress and may reactivate
- **WHEN** delete contribution succeeds
- **THEN** UI recomputes displayed progress/status from refetched data.

#### Scenario: Complete/cancel actions follow backend transitions
- **WHEN** complete or cancel succeeds
- **THEN** badge/status reflects backend state immediately.

#### Scenario: Contribution amount uses major-unit input with cents-safe payload
- **WHEN** user submits a contribution amount
- **THEN** frontend SHALL parse major-unit input to integer cents for API payload
- **AND** invalid/ambiguous values SHALL be rejected with inline validation.

#### Scenario: Page-level lifecycle actions report page-level errors
- **WHEN** complete/cancel/archive lifecycle actions fail
- **THEN** errors SHALL be routed to page-level error surface
- **AND** form-local error state SHALL remain reserved for goal form submission context.

### Requirement: Canonical error mapping and responsive behavior are preserved
Savings UI MUST respect canonical ProblemDetails handling and mobile layout constraints.

#### Scenario: Savings surfaces follow shared app-shell visual pattern
- **WHEN** `/app/savings` is rendered in authenticated shell
- **THEN** the page SHALL use the same container rhythm used by Dashboard/Transactions (`max-width`, spacing, and overflow constraints)
- **AND** primary cards and panels SHALL use consistent shell styling (`border-border/70`, `bg-card/95`, `shadow-sm`) to avoid visual drift.

### Requirement: Savings options loaders reuse shared query-key families
Savings options queries MUST reuse shared React Query keys for cache coherence across features.

#### Scenario: Accounts and categories options use shared keys
- **WHEN** savings page queries selectable accounts/categories options
- **THEN** queries SHALL use `optionQueryKeys.accounts(...)` and `optionQueryKeys.categories(...)` with explicit params
- **AND** ad-hoc keys (for example `accounts-options` variants) SHALL NOT be used.

