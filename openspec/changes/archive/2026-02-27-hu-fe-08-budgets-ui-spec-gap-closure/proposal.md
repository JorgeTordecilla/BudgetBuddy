## Why

The current Budgets screen is functional but does not fully match the intended HU-FE-08 contract and UX rules. We need to close these gaps now to prevent drift between frontend behavior, OpenSpec requirements, and the existing budgets API.

## What Changes

- Refine Budgets UI behavior to match spec-defined flows for month-range apply, deterministic sorting, and contract-driven validation feedback.
- Add missing frontend API coverage for `GET /budgets/{budget_id}` to complete the budgets endpoint set used by UI workflows.
- Align React Query conventions for budgets (`list` and `detail` key structure) and formalize query-module boundaries.
- Split Budgets page into clearer feature components (`form`, `table`, and query hooks module) to match frontend architecture policy.
- Improve ProblemDetails mapping for budget-specific `400` and `409` types, including field-level validation UX for month and limit.
- Expand tests for backend-driven `400` month-validation errors and other spec-required scenarios.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `frontend-budget-management`: Tighten requirements for budgets route behavior, query semantics, validation/error mapping, and module structure to match HU-FE-08.

## Impact

- Affected code: `frontend/src/features/budgets/*`, `frontend/src/api/budgets.ts`, `frontend/src/api/problemMessages.ts`, and budgets-related tests.
- Affected APIs: frontend consumption of `GET /budgets`, `POST /budgets`, `GET /budgets/{budget_id}`, `PATCH /budgets/{budget_id}`, `DELETE /budgets/{budget_id}`, plus category lookup via `GET /categories`.
- OpenAPI/media-type impact: no contract format changes; frontend remains strict with `application/vnd.budgetbuddy.v1+json` success and `application/problem+json` error handling.
- Dependencies: existing auth/session transport (`Authorization` bearer + `credentials: include`) and shared query invalidation with analytics views.
- Backwards compatibility: no backend breaking changes; this is a frontend behavior/spec-alignment hardening change.
