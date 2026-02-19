## Why

Bulk transaction import/export is essential for onboarding from bank CSV files and for user data portability. This change is needed now to reduce manual entry friction and enable practical migration in and out of BudgetBuddy.

## What Changes

- Add `POST /transactions/import` for bulk transaction ingestion (JSON batch first, optional CSV input mode).
- Add `GET /transactions/export` for filtered transaction export as `text/csv` (`from`, `to`, `type`, `account_id`, `category_id`).
- Add import result schemas with per-row failures and aggregate counters:
  - `TransactionImportRequest`
  - `TransactionImportResult`
  - `TransactionImportFailure`
- Enforce existing transaction business rules per imported row (ownership, archived resources, category/type compatibility, money invariants).
- Define import execution mode behavior (configurable all-or-nothing vs partial accept) and canonical error/validation semantics.
- Implement streaming CSV export to avoid high memory usage and preserve performance for large datasets.

## Capabilities

### New Capabilities
- `transaction-bulk-import-export`: Defines bulk transaction import/export API behavior, batch execution semantics, row-level failure reporting, and CSV streaming export requirements.

### Modified Capabilities
- `api-http-contract`: Extend contract requirements for `/transactions/import` and `/transactions/export`, including `text/csv` response behavior and request/response media-type negotiation.
- `budget-domain-management`: Extend transaction-domain requirements to cover reuse of existing business rules during bulk import processing.
- `problem-details-catalog`: Add/clarify canonical ProblemDetails mapping for import validation/business-rule failures, including sanitized row-level failure messages.

## Impact

- OpenAPI contract changes in `backend/openapi.yaml` and mirror in `openspec/specs/openapi.yaml`.
- New paths:
  - `POST /transactions/import`
  - `GET /transactions/export`
- New/updated components:
  - `TransactionImportRequest`, `TransactionImportResult`, `TransactionImportFailure`
  - Response/content definitions for CSV export (`text/csv`) and ProblemDetails alignment for import failures.
- Backend impact in transaction router/service/repository layers:
  - Batch import orchestration with configurable commit behavior.
  - Streaming export implementation for filtered datasets.
- Test impact:
  - Mixed-row import correctness and failure accounting.
  - CSV header/row count correctness.
  - Auth + media-type/content-type matrix for new endpoints.
- Backwards compatibility:
  - Additive API change; existing transaction endpoints and media types remain unchanged.
- Media-type impact:
  - Existing success/error policy preserved for JSON endpoints.
  - New export endpoint returns `text/csv` on success and `application/problem+json` on errors.
