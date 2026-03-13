## Purpose
Define frontend behavior for recurring bills management in BeBudget.

## Requirements

### Requirement: Bills route is available within authenticated app shell
The frontend MUST expose `/app/bills` as an authenticated route integrated with AppShell navigation.

#### Scenario: Authenticated route render
- **WHEN** an authenticated user navigates to `/app/bills`
- **THEN** the Bills page SHALL render under AppShell with active navigation state.

#### Scenario: Unauthenticated route guard
- **WHEN** unauthenticated access attempts `/app/bills`
- **THEN** existing auth guard behavior SHALL redirect or block access consistently.

### Requirement: Bills page presents month-scoped operational status and KPIs
The frontend MUST consume monthly status and render an operational dashboard for recurring bills.

#### Scenario: Month status list and KPI cards render
- **WHEN** monthly status for selected month loads successfully
- **THEN** the page SHALL render items with name, due date, budget, and KPI cards for Budgeted, Paid, and Pending totals.

#### Scenario: Status badges follow backend semantics
- **WHEN** items are rendered
- **THEN** badge mapping SHALL be `paid`, `pending`, `overdue` exactly as returned by backend, without client-side overdue recalculation.

#### Scenario: Month selector syncs URL
- **WHEN** user changes selected month
- **THEN** URL SHALL update to `?month=YYYY-MM` and query SHALL refetch for that month.

#### Scenario: Empty state is explicit
- **WHEN** there are no bills for user context
- **THEN** UI SHALL show `No bills yet — add your first recurring bill` with create CTA.

### Requirement: Bills create/edit/archive flows are contract-safe and validated
The frontend MUST support create/edit/archive actions with deterministic validation, major-unit money UX, and canonical error handling.

#### Scenario: Create bill validates due day range
- **WHEN** user enters `due_day` outside `[1..31]`
- **THEN** form SHALL block submit and show inline validation.

#### Scenario: Bills form communicates updated due-day range
- **WHEN** bills create/edit form is rendered
- **THEN** helper text, placeholders, and validation copy SHALL communicate the canonical due-day range `1-31`.

#### Scenario: Create bill filters category options to expense
- **WHEN** bill form category selector is shown
- **THEN** only expense categories SHALL be selectable.

#### Scenario: Edit and archive operations update list state
- **WHEN** user edits or archives a bill
- **THEN** frontend SHALL call `PATCH /bills/{id}` or `DELETE /bills/{id}` and refresh bills status/list views deterministically.

#### Scenario: Create/edit budget uses major-unit input with cents-safe payload
- **WHEN** user enters bill budget in create/edit form
- **THEN** frontend SHALL parse major-unit money input to integer cents before API submission
- **AND** invalid/ambiguous money values SHALL be blocked with inline validation
- **AND** raw cents SHALL NOT be shown in editable budget field prefill.

#### Scenario: Page-level archive failures stay on page-level problem surface
- **WHEN** archive bill action fails
- **THEN** error SHALL be routed to page-level error surface
- **AND** form-local edit/create error state SHALL remain unchanged.

### Requirement: Mark paid and unmark flows manage linked payment lifecycle
The frontend MUST provide guided payment actions matching backend lifecycle ownership rules while preserving consistent money UX.

#### Scenario: Mark as paid modal pre-fills major-unit amount
- **WHEN** user opens mark-paid action for pending/overdue bill
- **THEN** modal input SHALL prefill as major-unit money value derived from `budget_cents`
- **AND** input SHALL NOT show raw cents.

#### Scenario: Mark as paid submits month and amount
- **WHEN** user confirms payment
- **THEN** frontend SHALL call `POST /bills/{bill_id}/payments` with active month and selected `actual_cents` and refresh bills state.

#### Scenario: Mark as paid submits integer cents from parsed major-unit input
- **WHEN** user confirms payment amount in modal
- **THEN** frontend SHALL parse modal amount input as major-unit value and submit integer `actual_cents`
- **AND** malformed values SHALL be blocked locally.

#### Scenario: Unmark removes payment and returns pending
- **WHEN** user triggers unmark on paid bill
- **THEN** frontend SHALL call `DELETE /bills/{bill_id}/payments/{month}` and item SHALL return to non-paid state.

#### Scenario: Unmark failures stay on page-level problem surface
- **WHEN** unmark payment action fails
- **THEN** error SHALL be routed to page-level problem surface
- **AND** pay-modal-local problem state SHALL remain reserved for mark-paid submission context.

#### Scenario: Payment correction guidance is explicit
- **WHEN** mark-paid modal is shown
- **THEN** UI SHALL display guidance text: `Editing amount? Unmark and re-pay with the correct value.`

### Requirement: Bills errors and quality gates align with platform standards
Bills feature MUST follow canonical ProblemDetails UX behavior and existing quality gates.

#### Scenario: Canonical error mapping is specific by type
- **WHEN** bills endpoints return `400`, `401`, `403`, `409`, or `422`
- **THEN** frontend SHALL parse ProblemDetails and render type-specific messaging including `bill-category-type-mismatch`, `bill-due-day-invalid`, `bill-already-paid`, and `bill-inactive-for-month`.

#### Scenario: Bills UI remains responsive without horizontal overflow
- **WHEN** bills page and modals render on narrow viewports
- **THEN** content SHALL remain usable without horizontal page overflow.

#### Scenario: Bills implementation passes quality gates
- **WHEN** feature validation runs
- **THEN** `npm run test`, `npm run test:coverage`, `npm run build`, and backend `pytest` SHALL pass.

### Requirement: Bills options loaders reuse shared query-key families
Bills options queries MUST reuse shared React Query keys for cache coherence across features.

#### Scenario: Accounts and categories options use shared keys
- **WHEN** bills page queries selectable accounts/categories options
- **THEN** queries SHALL use `optionQueryKeys.accounts(...)` and `optionQueryKeys.categories(...)` with explicit params
- **AND** ad-hoc keys (for example `accounts-options` variants) SHALL NOT be used.

