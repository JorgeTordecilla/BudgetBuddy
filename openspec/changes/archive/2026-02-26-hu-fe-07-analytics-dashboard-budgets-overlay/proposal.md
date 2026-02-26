## Why

The frontend currently lacks an analytics experience that turns transactions and budgets into actionable insight. Users can manage entities but cannot easily answer key questions about trends, category concentration, and budget adherence.

## What Changes

- Add authenticated analytics page for date-range reporting with:
  - Monthly totals (income, expense, net).
  - Category breakdown (income and expense views).
  - Budget overlay (`budget_spent_cents` vs `budget_limit_cents`).
- Add strict API wrappers for:
  - `GET /analytics/by-month`
  - `GET /analytics/by-category`
- Add deterministic ProblemDetails handling for analytics status codes (`400/401/406/429`) and range-validation UX.
- Add reusable formatting/validation helpers for cents and date ranges.
- Add tests for formatting, date validation, invalid-date-range rendering, and category metric switching.

## Capabilities

### New Capabilities
- `frontend-analytics-dashboard`: Contract-first analytics dashboard with monthly trends, category breakdown, and budget overlays.

### Modified Capabilities
- None.

## Impact

- Affected code: `frontend/src/api/*`, `frontend/src/features/analytics/*`, routing/shell navigation, and shared utility modules.
- Affected APIs: frontend consumption of `GET /analytics/by-month` and `GET /analytics/by-category` under `VITE_API_BASE_URL`.
- Dependencies: existing auth/session flow, API client contract behavior, and React Query cache strategy.
- Backwards compatibility: no backend contract changes; frontend behavior remains aligned to vendor media type and canonical ProblemDetails.
