## Why

Transactions export is essential for reconciliation, external analysis (Excel/Sheets), and portability. The backend already exposes `GET /transactions/export` with CSV success and canonical ProblemDetails errors, but the frontend currently has no contract-safe export flow.

## What Changes

- Add CSV export capability from the Transactions page using the currently applied filters.
- Add frontend API wrapper for `GET /transactions/export` with CSV-aware content negotiation and ProblemDetails parsing.
- Add deterministic download behavior (`Blob` + browser download) with stable filename fallback.
- Preserve existing auth/session behavior (`401` refresh + single retry) and rate-limit handling (`429` + `Retry-After` feedback).
- Add tests for query composition, download behavior, and canonical error handling.
- Align backend CSV payload to user-facing export semantics by removing internal IDs/timestamps and exporting business columns (`date`, `type`, `account`, `category`, `amount_cents`, `merchant`, `note`).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `frontend-transactions-management`: Extend transaction frontend requirements to include contract-driven CSV export and associated UX/error handling.

## Impact

- Affected code:
  - `frontend/src/api/transactions.ts`
  - `frontend/src/pages/TransactionsPage.tsx`
  - `frontend/src/api/client.ts` (if per-request `Accept` override is needed)
  - `frontend/src/utils/download.ts` (new utility)
  - frontend tests for export flow and filter/query mapping
  - `backend/app/routers/transactions.py` (CSV export shape)
  - `backend/openapi.yaml` (CSV example alignment)
  - `backend/tests/test_api_integration.py` (CSV header assertion alignment)
- Affected APIs:
  - `GET /transactions/export`
  - existing auth refresh flow reused via shared API client
- Media type behavior:
  - request `Accept` must support CSV and ProblemDetails
  - response `200` uses `text/csv`
  - error responses use `application/problem+json`
- Backwards compatibility:
  - frontend enhancement plus CSV contract-shape hardening (user-facing columns, no internal IDs)
