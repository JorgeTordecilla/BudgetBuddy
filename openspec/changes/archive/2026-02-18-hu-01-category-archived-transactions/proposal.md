## Why

The API already blocks transactions on archived accounts, but it still allows transactions referencing archived categories. This creates domain inconsistency in analytics, category lifecycle semantics, and user expectations about archived entities.

## What Changes

- Add a business rule to reject transaction create/update when the resolved category is archived (`archived_at != null`).
- Canonicalize a new business conflict ProblemDetails for this case:
  - `type=https://api.budgetbuddy.dev/problems/category-archived`
  - `title=Category is archived`
  - `status=409`
- Apply the rule to both:
  - `POST /transactions`
  - `PATCH /transactions/{transaction_id}` (effective final state validation).
- Update OpenAPI contract to include `409` with `application/problem+json` for the affected transaction endpoints.
- Add integration tests for create + patch archived-category flows with exact canonical assertions.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `budget-domain-management`: transaction business rules extended to reject archived categories for create and patch.
- `api-http-contract`: canonical `409` ProblemDetails contract for category archived conflict and endpoint response mapping.

## Impact

- API/runtime: transaction validation path in `backend/app/routers/transactions.py` (or service equivalent).
- Shared errors: `backend/app/errors.py` new canonical helper/constants.
- Contract: transaction `POST/PATCH` responses in OpenAPI and OpenSpec specs.
- Tests: `backend/tests/test_api_integration.py` archived-category create/patch matrix.
- Backward compatibility: no success payload shape/status changes; conflict behavior becomes stricter and consistent.
