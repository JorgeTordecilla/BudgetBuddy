## MODIFIED Requirements

### Requirement: Monthly status provides operational state for active non-archived bills
The system MUST expose `GET /bills/monthly-status?month=YYYY-MM` returning per-bill status and month summary for active operational bills only, using the current UTC-derived date for overdue evaluation.

#### Scenario: Due date uses month-end clamping for long due_day
- **WHEN** a bill has `due_day` greater than the selected month's last day
- **THEN** monthly status due-date calculation SHALL clamp to that month's last day
- **AND** response generation SHALL remain successful.

#### Scenario: Monthly status excludes archived and inactive bills
- **WHEN** monthly status is requested
- **THEN** response items SHALL include only bills where `archived_at IS NULL` and `is_active=true`.

#### Scenario: Monthly status returns deterministic summary totals
- **WHEN** monthly status is requested
- **THEN** response summary SHALL include `total_budget_cents`, `total_paid_cents`, `total_pending_cents`, `paid_count`, and `pending_count` computed from returned items.

#### Scenario: Status is paid when payment exists
- **WHEN** a `BillPayment` exists for `(bill_id, month)`
- **THEN** item status SHALL be `paid` with `actual_cents`, `transaction_id`, and `diff_cents=actual_cents-budget_cents`.

#### Scenario: Overdue is only emitted for current UTC-derived month
- **WHEN** no payment exists and requested `month` equals the current UTC-derived month and `due_date < current UTC-derived date`
- **THEN** item status SHALL be `overdue`.

#### Scenario: Non-current month without payment remains pending
- **WHEN** no payment exists and requested month is past or future relative to the current UTC-derived month
- **THEN** item status SHALL be `pending` and SHALL NOT be marked overdue.

### Requirement: Bill payment lifecycle owns linked transaction lifecycle
The system MUST model bill payments as the owner of their generated transaction lifecycle using the current UTC-derived date for the generated transaction.

#### Scenario: Mark as paid creates payment and linked transaction atomically
- **WHEN** `POST /bills/{bill_id}/payments` is called for an eligible bill and month
- **THEN** the API SHALL create exactly one `Transaction` (`type=expense`) and one `BillPayment` linked to it in one atomic write and return `201`.

#### Scenario: Omitted actual amount defaults to bill budget
- **WHEN** `POST /bills/{bill_id}/payments` omits `actual_cents`
- **THEN** `BillPayment.actual_cents` and generated transaction amount SHALL use `bill.budget_cents`.

#### Scenario: Duplicate month payment is rejected
- **WHEN** a payment already exists for `(bill_id, month)`
- **THEN** the API SHALL return `409` ProblemDetails with canonical type `bill-already-paid` and SHALL NOT create another transaction.

#### Scenario: Inactive bill payment is rejected
- **WHEN** payment creation is requested for a bill with `is_active=false`
- **THEN** the API SHALL return `409` ProblemDetails with canonical type `bill-inactive-for-month`.

#### Scenario: Unmark removes payment and linked transaction
- **WHEN** `DELETE /bills/{bill_id}/payments/{month}` succeeds
- **THEN** the API SHALL delete both the `BillPayment` and its linked generated `Transaction` and return `204`.

#### Scenario: Archiving bill preserves historical payments
- **WHEN** a bill is archived
- **THEN** existing `BillPayment` rows and their transactions SHALL remain persisted for historical reporting.

#### Scenario: Bill payment generated transaction uses UTC current date
- **WHEN** `POST /bills/{bill_id}/payments` creates the linked transaction
- **THEN** the transaction date SHALL use the current UTC-derived date
- **AND** server-local timezone differences SHALL NOT shift the payment into a different calendar day.
