## 1. Backend Data Model and Migration

- [x] 1.1 Create Alembic migration `20260304_0007_add_bills.py` for `bills` and `bill_payments` tables, constraints, FKs, and unique `(bill_id, month)`.
- [x] 1.2 Add SQLAlchemy models `Bill` and `BillPayment` in `app/models.py` with ownership and lifecycle fields.
- [x] 1.3 Add indexes for user/month and payment lookup paths used by monthly-status and payment endpoints.
- [x] 1.4 Verify migration upgrade/downgrade on clean DB and existing DB path.

## 2. Backend Schemas and Error Taxonomy

- [x] 2.1 Add Pydantic schemas: `BillCreate`, `BillUpdate`, `BillOut`, `BillPaymentCreate`, `BillPaymentOut`, `BillMonthlyStatusItem`, `BillMonthlyStatusOut`.
- [x] 2.2 Add canonical ProblemDetails constants/helpers in `app/errors.py` for `bill-category-type-mismatch`, `bill-due-day-invalid`, `bill-already-paid`, and `bill-inactive-for-month`.
- [x] 2.3 Ensure schema serialization keeps vendor payload compatibility and deterministic null handling.

## 3. Backend Bills Router and Domain Rules

- [x] 3.1 Implement `app/routers/bills.py` with `POST /bills`, `GET /bills`, `PATCH /bills/{bill_id}`, `DELETE /bills/{bill_id}`.
- [x] 3.2 Enforce category type `expense` and ownership checks for account/category/bill resources.
- [x] 3.3 Enforce `due_day` validation `[1..28]` in runtime path with canonical 422 mapping.
- [x] 3.4 Implement list semantics: archived excluded by default, include_archived support, sorted by `due_day ASC`, include inactive records.

## 4. Backend Monthly Status and Payment Lifecycle

- [x] 4.1 Implement `GET /bills/monthly-status?month=YYYY-MM` with summary totals and per-item state payload.
- [x] 4.2 Implement status calculation rules: `paid` if payment exists, `overdue` only for current server month with passed due date, otherwise `pending`.
- [x] 4.3 Exclude `archived_at != null` and `is_active=false` bills from monthly-status results.
- [x] 4.4 Implement `POST /bills/{bill_id}/payments` creating linked expense transaction and payment atomically.
- [x] 4.5 Implement default `actual_cents=bill.budget_cents` when omitted.
- [x] 4.6 Enforce duplicate month protection with canonical `bill-already-paid` conflict.
- [x] 4.7 Enforce inactive-bill payment rejection with canonical `bill-inactive-for-month` conflict.
- [x] 4.8 Implement `DELETE /bills/{bill_id}/payments/{month}` to delete payment and linked generated transaction in one operation.
- [x] 4.9 Preserve historical `BillPayment` rows and linked transactions when bill is archived.

## 5. API Contract and Main App Integration

- [x] 5.1 Register `bills` router in `app/main.py` with existing auth and media-type policy.
- [x] 5.2 Update `backend/openapi.yaml` with bills paths, schemas, and canonical bill error mappings.
- [x] 5.3 Sync `openspec/specs/openapi.yaml` mirror to match backend OpenAPI changes.

## 6. Frontend API and Query Layer

- [x] 6.1 Add bill types to `src/api/types.ts` and canonical problem types/mappings in `problemTypes.ts` and `problemMapping.ts`.
- [x] 6.2 Create `src/api/bills.ts` wrappers for bills CRUD, monthly-status, mark-paid, and unmark endpoints.
- [x] 6.3 Add bills query key strategy and hooks for month-scoped reads and mutation invalidation.
- [x] 6.4 Ensure mutations invalidate `bills`, `transactions`, and `analytics` queries where required.

## 7. Frontend Bills UI and Routing

- [x] 7.1 Add route wiring for `/app/bills` in router configuration and nav entry in `AppShell`.
- [x] 7.2 Implement `src/pages/BillsPage.tsx` with month selector (URL sync), KPI cards, list state rendering, and zero-state CTA.
- [x] 7.3 Implement `BillStatusBadge` for `paid/pending/overdue` display based on backend-provided state.
- [x] 7.4 Implement `BillForm` create/edit modal with due-day range validation and expense-only category selector.
- [x] 7.5 Implement `BillPayModal` for mark-paid flow with prefilled budget amount, read-only account/category, and correction guidance text.
- [x] 7.6 Implement unmark action for paid bills and deterministic UI refresh.
- [x] 7.7 Ensure bills page and modals remain responsive without horizontal overflow on mobile.

## 8. Backend and Frontend Test Coverage

- [x] 8.1 Add backend integration tests for BL-B-01..BL-B-18 in `backend/tests/test_api_integration.py`.
- [x] 8.2 Add backend contract tests for new OpenAPI paths/schemas/error mappings in `backend/tests/test_contract_openapi.py`.
- [x] 8.3 Add frontend API wrapper tests in `src/api/bills.test.ts`.
- [x] 8.4 Add page/component tests in `src/pages/BillsPage.test.tsx` and bill component tests for BL-F-01..BL-F-12.
- [x] 8.5 Add responsive and canonical ProblemDetails message assertions for bill error paths.

## 9. Verification and Quality Gates

- [x] 9.1 Run backend test suite: `cd backend && source .venv/bin/activate && python -m pytest`.
- [x] 9.2 Run frontend suite: `cd frontend && npm run test`.
- [x] 9.3 Run frontend coverage gate: `cd frontend && npm run test:coverage`.
- [x] 9.4 Run frontend build gate: `cd frontend && npm run build`.
- [x] 9.5 Validate monthly-status state semantics manually (`paid/pending/overdue` current-month rule) and URL month sync behavior.
