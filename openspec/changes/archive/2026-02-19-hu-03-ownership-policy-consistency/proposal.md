## Why

Current behavior and tests allow ambiguity for non-owned resources (`403` or `404`) across GET/PATCH/DELETE endpoints. This creates unstable API expectations and test flakiness.

HU-03 defines a single, deterministic policy for ownership violations in domain resources.

## What Changes

- Choose and enforce one policy across accounts, categories, and transactions ownership checks.
- Decision for this change: **Option B, return `403 Forbidden`** for non-owned resources.
- Ensure all ownership guards use a single canonical helper and ProblemDetails shape.
- Update OpenAPI responses for all scoped endpoints to reflect the chosen status.
- Update and expand tests so cross-user access assertions are consistent and deterministic.

## Scope

- `GET /accounts/{account_id}`
- `PATCH /accounts/{account_id}`
- `DELETE /accounts/{account_id}`
- `GET /categories/{category_id}`
- `PATCH /categories/{category_id}`
- `DELETE /categories/{category_id}`
- `GET /transactions/{transaction_id}`
- `PATCH /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`

## Impact

- Runtime code: ownership checks and centralized error helpers.
- Contract: OpenAPI status mapping and docs consistency.
- Tests: ownership/cross-user matrix updates.
- Compatibility: clients now get one guaranteed policy (`403`) for non-owned resources.
