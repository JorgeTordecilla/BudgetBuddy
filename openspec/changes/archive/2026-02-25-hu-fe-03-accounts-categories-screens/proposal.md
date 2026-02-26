## Why

Authenticated users currently cannot manage accounts and categories from the frontend, which blocks real-world budgeting setup and maintenance. This change introduces contract-aligned management screens for these core entities.

## What Changes

- Add authenticated frontend pages for accounts and categories management at `/app/accounts` and `/app/categories`.
- Add AppShell navigation links for both pages.
- Implement list/create/edit/archive flows for accounts.
- Implement list/create/edit/archive/restore flows for categories.
- Implement cursor pagination (`next_cursor`) with append + reset behavior on filter changes.
- Enforce strict API contract usage in frontend HTTP calls (vendor media type, problem+json handling, credentials include).
- Surface canonical ProblemDetails in UI with deterministic handling for 401/403/406/409.
- Add unit tests for API wrappers and pagination behavior; add smoke verification steps for end-to-end flows.

## Capabilities

### New Capabilities
- `frontend-budget-setup-management`: Authenticated accounts/categories UI management with contract-safe API consumption, pagination, and canonical error UX.

### Modified Capabilities
- None.

## Impact

- Affected code: `frontend/src/pages/*`, `frontend/src/api/*`, `frontend/src/components/*`, `frontend/src/routes/AppShell.tsx`, and related route wiring.
- Affected APIs: frontend consumption of existing `/accounts` and `/categories` endpoints under `VITE_API_BASE_URL`.
- Dependencies: expected use of existing auth/session flow from HU-FE-02; optional React Query integration for cache + invalidation.
- Backwards compatibility: no backend contract changes; frontend behavior remains aligned to existing OpenAPI contract and media types.
