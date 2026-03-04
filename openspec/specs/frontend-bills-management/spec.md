## Purpose
Define frontend behavior for recurring bills management in BudgetBuddy.

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
The frontend MUST support create/edit/archive actions with deterministic validation and canonical error handling.

#### Scenario: Create bill validates due day range
- **WHEN** user enters `due_day` outside `[1..28]`
- **THEN** form SHALL block submit and show inline validation.

#### Scenario: Create bill filters category options to expense
- **WHEN** bill form category selector is shown
- **THEN** only expense categories SHALL be selectable.

#### Scenario: Edit and archive operations update list state
- **WHEN** user edits or archives a bill
- **THEN** frontend SHALL call `PATCH /bills/{id}` or `DELETE /bills/{id}` and refresh bills status/list views deterministically.

### Requirement: Mark paid and unmark flows manage linked payment lifecycle
The frontend MUST provide guided payment actions matching backend lifecycle ownership rules.

#### Scenario: Mark as paid modal pre-fills budget amount
- **WHEN** user opens mark-paid action for pending/overdue bill
- **THEN** modal SHALL prefill `actual_cents` from bill budget and show account/category read-only context.

#### Scenario: Mark as paid submits month and amount
- **WHEN** user confirms payment
- **THEN** frontend SHALL call `POST /bills/{bill_id}/payments` with active month and selected `actual_cents` and refresh bills state.

#### Scenario: Unmark removes payment and returns pending
- **WHEN** user triggers unmark on paid bill
- **THEN** frontend SHALL call `DELETE /bills/{bill_id}/payments/{month}` and item SHALL return to non-paid state.

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
