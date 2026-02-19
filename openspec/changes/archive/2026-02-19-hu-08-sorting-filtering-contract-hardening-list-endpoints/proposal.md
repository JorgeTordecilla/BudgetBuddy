## Why

List endpoints are the highest-risk integration surface and currently rely on implicit behavior for ordering and combined filters. This change hardens the transaction list contract so clients get deterministic ordering and canonical error handling for invalid ranges.

## What Changes

- Formalize `GET /transactions` deterministic ordering contract as primary `date desc` with a stable tie-breaker (`created_at desc`).
- Formalize and validate combined filtering semantics for `type`, `account_id`, `category_id`, `from`, `to`, and `include_archived` on transaction lists.
- Add canonical invalid-range behavior: when `from > to`, return `400` ProblemDetails with a stable `type/title/status`.
- Update OpenAPI and OpenSpec contract wording so list ordering/filter/range behavior is explicit and testable.
- Add/adjust integration tests to lock in deterministic order, combined filters, and canonical invalid-range error behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: Extend transaction-list HTTP contract with deterministic order and canonical invalid date-range ProblemDetails.
- `budget-domain-management`: Define transaction-list domain behavior for combined filters and stable ordering semantics.
- `problem-details-catalog`: Add canonical ProblemDetails entry for invalid transaction date range (`from > to`).

## Impact

- OpenAPI contract files: `backend/openapi.yaml`, `openspec/specs/openapi.yaml`.
- Runtime list behavior in `backend/app/routers/transactions.py` and possible cursor alignment in `backend/app/core/pagination.py`.
- Error helper catalog in `backend/app/errors.py` for invalid-range canonical ProblemDetails.
- Integration tests in `backend/tests/test_api_integration.py`.
- Backwards compatibility: stricter and explicit behavior for invalid date ranges (`400` instead of implicit/undefined behavior).
- Media types remain unchanged: success `application/vnd.budgetbuddy.v1+json`, errors `application/problem+json`.
