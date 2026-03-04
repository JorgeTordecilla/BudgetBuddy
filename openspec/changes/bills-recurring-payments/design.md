## Context

BudgetBuddy currently models fixed obligations only through generic transactions, which does not expose operational monthly bill state (paid/pending/overdue) and requires duplicate user actions (track + post transaction separately). The change introduces recurring bills and bill payments with deterministic transaction side-effects while preserving existing contract-first API and ProblemDetails behavior.

Constraints:
- Contract-first: OpenAPI must remain source of truth for new paths/schemas.
- Existing media types remain unchanged (`application/vnd.budgetbuddy.v1+json` success, `application/problem+json` errors).
- Existing ownership model and archived-resource conflict semantics must remain consistent with accounts/categories/transactions.
- Time-sensitive status (`overdue`) must be deterministic and not dependent on client timezone.

Stakeholders:
- End users managing recurring obligations.
- Backend maintainers preserving canonical error taxonomy and transaction safety.
- Frontend maintainers preserving route/query patterns and responsive behavior.

## Goals / Non-Goals

**Goals:**
- Introduce `Bill` and `BillPayment` domain entities with ownership, lifecycle, and month-level payment uniqueness.
- Expose `/bills` CRUD plus `/bills/monthly-status` and payment lifecycle endpoints.
- Auto-create expense `Transaction` on mark-as-paid and auto-delete linked transaction on unmark.
- Enforce strict rules for `due_day (1..28)`, category type (`expense`), and inactive bill payment rejection.
- Provide frontend `/app/bills` operational workflow with month selector, KPIs, status badges, and payment modal.
- Keep canonical ProblemDetails mappings for new bill-specific conflict/validation paths.

**Non-Goals:**
- No proration, variable recurrence intervals, or multi-installment billing.
- No historical bills report API beyond operational monthly-status in this change.
- No editing of generated payment transaction from bills flow; correction remains unmark + repay.
- No automatic backfill/migration of existing transactions into bills/payments.

## Decisions

### D1. Data model: separate `bills` and `bill_payments` tables with unique month payment
- `bills`: configuration and lifecycle metadata (`due_day`, `budget_cents`, `is_active`, `archived_at`).
- `bill_payments`: month realization record + `transaction_id` linkage.
- `UNIQUE (bill_id, month)` ensures one payment per bill/month.

Rationale:
- Clean separation between recurring template and realized monthly payment.
- Prevents duplicate payment creation races.

Alternative considered:
- Single bills table with per-month status columns.
  - Rejected: denormalized and not scalable across months.

### D2. Transaction lifecycle is owned by `BillPayment`
- Mark paid creates both `Transaction` and `BillPayment` atomically.
- Unmark always deletes both `BillPayment` and linked generated `Transaction`.

Rationale:
- Removes ambiguity when generated transaction is edited independently.
- Preserves one clear correction flow: unmark + re-pay with correct amount.

Alternative considered:
- Keep transaction on unmark and detach payment.
  - Rejected: inconsistent ownership and ambiguous reconciliation.

### D3. State precedence and operational inclusion
- `archived_at != null` has absolute precedence: excluded from all operational monthly-status output.
- `is_active=false` is temporary operational opt-out: visible in `/bills` list, excluded from monthly-status.
- Payment creation for inactive bill is rejected (`409 bill-inactive-for-month`).

Rationale:
- Distinguishes lifecycle (archive) from temporary participation (active flag).
- Prevents accidental payment posting for paused bills.

### D4. Overdue semantics are server-month only
- `overdue` is computed only when requested month equals server current month and due date has passed.
- Past/future months without payment remain `pending`.

Rationale:
- Avoids incorrect red states when browsing historical/future months.
- Avoids client timezone drift by server-side decision.

### D5. Error taxonomy extends canonical ProblemDetails catalog
Add canonical types:
- `bill-category-type-mismatch` (409)
- `bill-due-day-invalid` (422)
- `bill-already-paid` (409)
- `bill-inactive-for-month` (409)

Rationale:
- Keeps deterministic contract behavior aligned with existing platform error policy.

### D6. Frontend architecture follows existing route/query patterns
- New `BillsPage` under AppShell route `/app/bills`.
- API wrappers in `src/api/bills.ts` with shared client + ProblemDetails handling.
- React Query keys scoped to `bills` and month; invalidate `bills`, `transactions`, `analytics` after payment/unmark.
- Payment modal includes explicit correction guidance text.

Rationale:
- Reuses proven patterns from transactions/analytics/rollover features.
- Ensures consistent user feedback and cache freshness.

## Risks / Trade-offs

- [Risk] Deleting generated transaction on unmark may surprise users expecting edit-in-place.
  - Mitigation: explicit UI guidance and deterministic correction flow in modal.

- [Risk] Server-date overdue logic may differ from user local expectation near midnight timezone boundaries.
  - Mitigation: document server-based operational rule and keep status source of truth in backend response.

- [Risk] Inactive bill payment rejection can frustrate users if they forget reactivation step.
  - Mitigation: frontend message mapped from canonical `bill-inactive-for-month` with clear action guidance.

- [Risk] New endpoints increase OpenAPI and test surface area.
  - Mitigation: contract tests + integration tests for all BL-B scenarios and frontend BL-F flows.

## Migration Plan

1. Add Alembic migration creating `bills` and `bill_payments` tables with constraints and indexes.
2. Add SQLAlchemy models and Pydantic schemas.
3. Implement `bills` router and register in app main.
4. Add canonical bill ProblemDetails constants/helpers and map endpoint errors.
5. Update `backend/openapi.yaml` and `openspec/specs/openapi.yaml` mirror.
6. Implement frontend API/types/page/components + route/nav integration.
7. Add backend/frontend tests for acceptance criteria and quality gates.

Rollback:
- Revert router/model/schema/frontend changes.
- Roll back migration by dropping `bill_payments` and `bills` tables.

## Open Questions

- Should month-level inactive behavior evolve from boolean `is_active` to scoped pause windows (e.g., start/end month) in future?
- Should a future historical bills report API join bill name snapshots with transaction merchant snapshots for audit clarity?
