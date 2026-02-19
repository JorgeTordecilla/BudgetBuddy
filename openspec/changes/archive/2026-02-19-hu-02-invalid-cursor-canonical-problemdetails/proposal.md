## Why

Cursor-based pagination is part of the API contract, but invalid cursor inputs can currently fail with inconsistent 400 payloads or unexpected internal errors. A canonical invalid-cursor ProblemDetails response is needed for stable client-side recovery and predictable behavior.

## What Changes

- Canonize invalid cursor failures for list endpoints:
  - `GET /accounts`
  - `GET /categories`
  - `GET /transactions`
- Define exact ProblemDetails contract for invalid cursor:
  - `type=https://api.budgetbuddy.dev/problems/invalid-cursor`
  - `title=Invalid cursor`
  - `status=400`
- Add shared helper/constants in `backend/app/errors.py` for invalid cursor.
- Update `backend/app/core/pagination.py` so `decode_cursor(...)` fails with canonical APIError.
- Ensure list routers use shared `decode_cursor` path and do not swallow cursor errors.
- Add integration tests asserting exact canonical fields for all three endpoints.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: canonical ProblemDetails definition for invalid cursor on paginated list endpoints.
- `budget-domain-management`: consistent invalid cursor behavior across accounts/categories/transactions list operations.

## Impact

- Code: `backend/app/errors.py`, `backend/app/core/pagination.py`, list handlers in accounts/categories/transactions routers.
- Tests: `backend/tests/test_api_integration.py` invalid cursor matrix for all list endpoints.
- Backward compatibility: no success payload changes; 400 error contract becomes deterministic.
