## Why

Code review identified two correctness gaps in remaining frontend pages: one stale-hook dependency risk in transactions route effects and one uncaught mutation failure path in savings contribution deletion. Addressing these now prevents silent failures and stabilizes behavior before additional feature work lands on these pages.

## What Changes

- Fix `useEffect` dependency completeness in transactions deep-link flow (`action=new`) so modal-open behavior remains deterministic and lint-safe.
- Add explicit error handling to savings contribution deletion flow so failed deletes surface canonical feedback instead of propagating unhandled errors.
- Refactor analytics impulse-summary rendering to remove JSX IIFE and keep conditional content readable/testable.
- Standardize option-list query keys used by transactions page with existing resource-oriented key patterns for account/category/income-source caches.
- Consolidate duplicated `toLocalProblem` helper usage into a shared utility module for consistency across pages.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `frontend-transactions-management`: tighten transactions route effect determinism for `action=new` deep-link behavior and align options-query cache semantics.
- `frontend-savings-management`: ensure contribution delete failures are surfaced through canonical page-level error handling.

## Impact

- **Affected code (frontend)**:
  - `frontend/src/pages/TransactionsPage.tsx`
  - `frontend/src/pages/SavingsPage.tsx`
  - `frontend/src/features/analytics/AnalyticsPage.tsx`
  - shared utility modules for query keys / local ProblemDetails wrapping
- **Affected tests**:
  - `frontend/src/pages/TransactionsPage.test.tsx`
  - `frontend/src/pages/SavingsPage.test.tsx`
  - `frontend/src/features/analytics/AnalyticsPage.test.tsx`
- **OpenAPI/contract touchpoints (no endpoint shape changes)**:
  - `GET /transactions`
  - `POST /transactions`
  - `PATCH /transactions/{transaction_id}`
  - `DELETE /transactions/{transaction_id}`
  - savings contribution mutation paths used by frontend delete-contribution flow
  - `application/problem+json` parsing behavior remains canonical
- **Backwards compatibility**:
  - No API schema or media-type changes.
  - No **BREAKING** changes expected.
