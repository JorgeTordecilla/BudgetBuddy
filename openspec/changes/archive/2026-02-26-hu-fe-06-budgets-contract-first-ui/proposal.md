## Why

The frontend does not yet expose budget management, which prevents users from defining monthly limits per category and tracking budget discipline. This change adds a contract-first budgets UI aligned with existing auth/session and ProblemDetails behavior.

## What Changes

- Add authenticated budgets page at `/app/budgets` with month-range filtering (`from`, `to`).
- Add create/edit/archive budget flows using backend budgets endpoints.
- Add budget form UX for `month`, `category_id`, and money input converted to `limit_cents` integer.
- Reuse strict API client behavior (vendor media type, bearer auth, `credentials: include`, ProblemDetails parsing).
- Add deterministic ProblemDetails UX mapping for canonical status codes and domain conflicts (`budget-duplicate`, `category-archived`, `category-not-owned`).
- Add tests for month validation, money-to-cents conversion, and conflict feedback.

## Capabilities

### New Capabilities
- `frontend-budget-management`: Contract-first budgets list/create/update/archive flows with deterministic error handling and cache invalidation.

### Modified Capabilities
- None.

## Impact

- Affected code: `frontend/src/api/*`, `frontend/src/pages/*` or `frontend/src/features/budgets/*`, shared components for modal/dialog/error banners, and app-shell navigation.
- Affected APIs: frontend consumption of `GET/POST/PATCH/DELETE /budgets` and `GET /categories` under `VITE_API_BASE_URL`.
- Dependencies: existing auth/session infrastructure from HU-FE-02 and React Query caching strategy.
- Backwards compatibility: no backend contract changes; frontend remains aligned to OpenAPI media types and canonical ProblemDetails.
