## 1. Dashboard Cockpit Surface

- [x] 1.1 Replace placeholder `/app/dashboard` with cockpit page implementation.
- [x] 1.2 Add month selector (default current month; recent month switching).
- [x] 1.3 Render KPI cards: income, expense, net, and budget progress.
- [x] 1.4 Render loading skeletons, empty states, and explicit fallback states.

## 2. Cockpit Data and Alert Logic

- [x] 2.1 Add dashboard query module(s) for:
  - `GET /analytics/by-month`
  - `GET /analytics/by-category`
  - `GET /transactions` expense sample
- [x] 2.2 Implement over-budget alert derivation from category analytics overlays.
- [x] 2.3 Implement deterministic spending spikes helper (median + threshold rule).
- [x] 2.4 Add cockpit primary actions and bridge CTAs to transactions, budgets, and analytics.

## 3. Bridge Query-Param Interoperability

- [x] 3.1 Update analytics page to accept initial `from`/`to` query params.
- [x] 3.2 Update budgets page to accept initial `month` query param (prefill `from`/`to`).
- [x] 3.3 Update transactions page to accept initial `from`/`to`/`type` query params.
- [x] 3.4 Ensure prefill behavior does not break existing explicit apply/filter UX.

## 4. Error UX and Contract Safety

- [x] 4.1 Reuse HU-FE-11 global ProblemDetails patterns for dashboard failures.
- [x] 4.2 Preserve request-id visibility/copy behavior on dashboard and bridge failures.
- [x] 4.3 Preserve vendor media-type/auth transport behavior through shared API client.

## 5. Tests

- [x] 5.1 Unit: spike helper median and detection thresholds.
- [x] 5.2 Component: dashboard loading/empty/error state rendering.
- [x] 5.3 Component: over-budget and spikes panel behavior.
- [x] 5.4 Component/page tests: query-param prefill on analytics, budgets, and transactions pages.

## 6. Verification

- [x] 6.1 Run `npm run test` in `frontend`.
- [x] 6.2 Run `npm run test:coverage` in `frontend` and meet project thresholds.
- [x] 6.3 Run `npm run build` in `frontend`.
