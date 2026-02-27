## Why

Error handling is currently fragmented across frontend screens, producing inconsistent user messages and making support/debugging harder. The backend already provides canonical `application/problem+json` errors and `X-Request-Id`, so we should standardize frontend UX around that contract now.

## What Changes

- Introduce a global frontend error model that normalizes API, ProblemDetails, and network failures into one typed shape.
- Add centralized `problem.type -> UX` mapping to enforce deterministic message and presentation policy (toast, inline, or both).
- Add reusable error UI components for inline and toast rendering with `X-Request-Id` visibility and copy action.
- Integrate standardized error handling with React Query for queries and mutations without duplicating page-level logic.
- Adopt the new model in critical flows (transactions, budgets, analytics, auth/session-sensitive routes).

## Capabilities

### New Capabilities
- `frontend-error-ux`: Global ProblemDetails-aware error normalization, mapping, and request-id-driven UX patterns for frontend routes.

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `frontend/src/api/client.ts` (error normalization hook points)
  - `frontend/src/api/errors.ts` (new)
  - `frontend/src/api/problemMapping.ts` (new)
  - `frontend/src/components/errors/*` (new)
  - `frontend/src/query/queryClient.ts` (global React Query error policy)
  - adoption updates in pages/forms that currently render ad-hoc ProblemDetails
- Affected APIs:
  - Contract handling for ProblemDetails responses across existing endpoints (not new endpoints)
- Media-type impact:
  - Preserve `application/vnd.budgetbuddy.v1+json` success handling
  - Standardize `application/problem+json` parsing for errors
- Backwards compatibility:
  - Non-breaking behavior hardening; user-facing messaging becomes deterministic and support-oriented
