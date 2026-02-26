## 1. Routing and shell integration

- [x] 1.1 Add authenticated `/app/analytics` route wiring in frontend router.
- [x] 1.2 Add `Analytics` navigation entry in `AppShell`.
- [x] 1.3 Add route-level test proving `/app/analytics` renders under `RequireAuth` + `AppShell`.

## 2. API layer and contract handling

- [x] 2.1 Add `src/api/analytics.ts` wrappers for by-month and by-category queries with typed responses.
- [x] 2.2 Ensure analytics wrappers use shared client semantics (vendor `Accept`, bearer auth, `credentials: include`, ProblemDetails parsing).
- [x] 2.3 Add deterministic analytics ProblemDetails mapping for `400/401/406/429`.

## 3. Analytics feature module

- [x] 3.1 Add `src/features/analytics/AnalyticsPage.tsx` with date range filter and explicit loading/empty/error states.
- [x] 3.2 Add `src/features/analytics/components/MonthTrendChart.tsx` and monthly table fallback.
- [x] 3.3 Add `src/features/analytics/components/CategoryBreakdown.tsx` with income/expense metric switching and sorted totals.
- [x] 3.4 Add budget overlay rendering (`spent`, `limit`, `% used`) with `No budget` behavior for zero/empty limits.
- [x] 3.5 Add React Query hooks/keys in `src/features/analytics/analyticsQueries.ts`:
- [x] 3.6 `["analytics", "by-month", { from, to }]`
- [x] 3.7 `["analytics", "by-category", { from, to }]`

## 4. Validation and UX behavior

- [x] 4.1 Add date range defaults (current month start to today) and client validation (`from <= to`).
- [x] 4.2 Handle `400 invalid-date-range` as inline filter error near date controls.
- [x] 4.3 Handle `401` with existing auth recovery policy and `406` as contract-error banner.
- [x] 4.4 Handle `429` with deterministic try-later feedback and include Retry-After when available.
- [x] 4.5 Add utility helpers in `src/utils/money.ts` and `src/utils/dates.ts` for deterministic formatting/validation.

## 5. Tests and verification

- [x] 5.1 Add unit tests for cents formatting helpers.
- [x] 5.2 Add unit tests for date range validation and default range helpers.
- [x] 5.3 Add component test rendering invalid-date-range error.
- [x] 5.4 Add component test for category metric switching (income/expense).
- [x] 5.5 Run `npm run test` in `frontend/`.
- [x] 5.6 Run `npm run test:coverage` in `frontend/` and ensure global coverage >= 90%.
- [x] 5.7 Run `npm run build` in `frontend/`.
