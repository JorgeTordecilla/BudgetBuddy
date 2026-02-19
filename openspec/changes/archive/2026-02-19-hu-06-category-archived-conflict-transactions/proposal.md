## Why

Transactions already enforce `account-archived` and `category-type-mismatch` conflicts, but category archival must be equally protected to avoid domain inconsistency in write flows. This change hardens `category-archived` handling for create and patch with canonical ProblemDetails and directional test coverage.

## What Changes

- Ensure `POST /transactions` rejects archived categories with canonical `409` ProblemDetails:
- `type=https://api.budgetbuddy.dev/problems/category-archived`
- `title=Category is archived`
- `status=409`
- Ensure `PATCH /transactions/{transaction_id}` rejects effective final state using an archived category (including `category_id` changes and effective keep-path) with the same canonical `409`.
- Enforce shared business-rule validation path for create and patch to avoid duplicated logic and drift.
- Add/adjust integration tests for create and patch archived-category conflict matrix with exact `type/title/status` assertions.
- Keep error media type `application/problem+json` and success media type `application/vnd.budgetbuddy.v1+json`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: Clarify canonical `category-archived` conflict behavior for transaction create/patch and required response shape.
- `budget-domain-management`: Strengthen transaction write business-rule requirement to include archived-category rejection on create and patch effective state.

## Impact

- Runtime paths: `backend/app/errors.py`, `backend/app/routers/transactions.py` (or shared rule module).
- Tests: `backend/tests/test_api_integration.py`.
- Contract/specs: `backend/openapi.yaml`, `openspec/specs/openapi.yaml`, and OpenSpec capability specs.
- Backward compatibility: no success-payload schema change; no media-type change; stricter documented conflict behavior for invalid writes.
