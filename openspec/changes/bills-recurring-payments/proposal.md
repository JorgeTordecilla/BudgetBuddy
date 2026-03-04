## Why

BudgetBuddy today models fixed monthly obligations through generic transactions, which forces users to manually track whether each recurring bill has already been paid. This creates daily operational friction and weak month-level visibility for pending vs paid obligations.

## What Changes

- Introduce recurring bills as first-class entities with due day, planned monthly amount, account/category binding, active flag, and archive lifecycle.
- Add monthly operational status endpoint for bills (`paid`, `pending`, `overdue`) with deterministic summary KPIs.
- Add explicit bill payment flows that auto-create and auto-delete linked expense transactions.
- Enforce strict state semantics:
- `archived_at` has absolute precedence (never shown in monthly operational status).
- `is_active=false` means temporarily out of monthly flow and cannot be paid.
- Add canonical bill-specific ProblemDetails types (category mismatch, due day invalid, already paid, inactive for month).
- Add frontend Bills experience (`/app/bills`) with month selector, KPI cards, status badges, create/edit/archive flows, and mark/unmark payment modal.
- Keep contract-first behavior and media types aligned with existing platform rules (`application/vnd.budgetbuddy.v1+json`, `application/problem+json`).

## Capabilities

### New Capabilities
- `bills-recurring-management`: Backend domain and API for bills CRUD, monthly status, and payment lifecycle with transaction linkage.
- `frontend-bills-management`: Frontend route and UX for bills monthly operations, payments, and canonical error handling.

### Modified Capabilities
- `problem-details-catalog`: Add canonical bill-related ProblemDetails identities and mappings.
- `api-http-contract`: Extend OpenAPI with `/bills` and `/bills/*` paths plus bill schemas and error references.

## Impact

- Backend:
- New tables: `bills`, `bill_payments` via Alembic migration.
- New router: `/bills` CRUD, `/bills/monthly-status`, `/bills/{id}/payments` create/delete.
- Transaction side-effects during bill payment/unmark operations.
- New ProblemDetails constants/helpers in `app/errors.py`.
- Schema updates in `app/schemas.py` and OpenAPI contract updates in `backend/openapi.yaml` + `openspec/specs/openapi.yaml` mirror.
- Integration tests extended for BL-B-01..BL-B-18 + state rules (`is_active`, archived exclusion, payment uniqueness).

- Frontend:
- New Bills page and components for bill form, payment modal, status badge, and month-level summary.
- New API wrappers/types and error mappings for bill endpoints.
- AppShell navigation and route registration updates for `/app/bills`.
- Query invalidation integration with existing `transactions` and `analytics` families after payment/unmark operations.

- Compatibility and behavior notes:
- Additive API expansion (new paths/schemas), no breaking change to existing endpoints.
- Historical bill payments persist even when bill is archived; archived bills are excluded from monthly operational status.
- `overdue` is computed server-side only when `month == current_month` to avoid timezone/client drift.
