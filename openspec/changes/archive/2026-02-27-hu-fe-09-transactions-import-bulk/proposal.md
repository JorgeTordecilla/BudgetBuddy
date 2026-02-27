## Why

BudgetBuddy already supports single transaction CRUD, but onboarding and data migration remain slow without bulk import. Users need a contract-safe import workflow that can process many rows at once, clearly report per-row failures, and preserve existing auth/session reliability.

## What Changes

- Add a dedicated authenticated import route at `/app/transactions/import` with mode selection (`partial` or `all_or_nothing`).
- Add frontend API wrapper for `POST /transactions/import` using existing vendor media type and ProblemDetails handling.
- Add JSON input parsing/validation supporting two input shapes:
  - Full request object: `{ mode, items }`
  - Convenience array: `items[]` (mode provided by UI control)
- Add deterministic import result rendering with summary and per-item failure details (`index`, `message`, optional ProblemDetails).
- Preserve auth/session behavior via existing API client (`401` refresh + single retry).
- Invalidate transaction and analytics caches after successful imports.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `frontend-transactions-management`: Extend transactions frontend requirements to include bulk import route, parser rules, API contract behavior, and result/error UX.

## Impact

- Affected code:
  - `frontend/src/api/transactions.ts`
  - `frontend/src/features/transactions/import/*`
  - `frontend/src/main.tsx`
  - `frontend/src/routes/AppShell.tsx`
  - tests for parser and import page behavior
- Affected APIs:
  - `POST /transactions/import`
  - existing auth refresh flow (`POST /auth/refresh`) reused via API client
- Media type impact: no backend contract changes; strict use of
  - success `application/vnd.budgetbuddy.v1+json`
  - error `application/problem+json`
- Backwards compatibility: additive frontend change, no breaking API modifications.
