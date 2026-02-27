## Why

`/app/dashboard` is still a placeholder, so authenticated users miss a fast month-health snapshot and direct next actions. We need a cockpit view that summarizes current-month health (income, expense, net, budget progress), surfaces actionable alerts (over-budget categories and spending spikes), and bridges into detailed screens with prefilled filters.

## What Changes

- Implement a contract-driven dashboard cockpit at `/app/dashboard` using existing analytics and transactions endpoints.
- Add month selection behavior (current month default, recent-month switching) and deterministic KPI computation.
- Add alerts panel:
  - Over-budget categories from analytics-by-category data.
  - Expense spikes from transaction sample using a transparent median-based rule.
- Add primary cockpit actions and bridge links to transactions, budgets, and analytics.
- Align dashboard loading/empty/error UX with global ProblemDetails handling and request-id surfacing.
- Add URL-prefill bridge support in target pages (`/app/budgets`, `/app/transactions`, `/app/analytics`) so dashboard links open with pre-applied context.

## Capabilities

### New Capabilities
- `frontend-dashboard-cockpit`: Month health snapshot UX, KPI/alert rules, and dashboard action/bridge behavior for authenticated users.

### Modified Capabilities
- `frontend-analytics-dashboard`: Add URL-driven initial date-range prefill behavior for cockpit bridges.
- `frontend-budget-management`: Add URL-driven initial month prefill behavior for cockpit bridge links.
- `frontend-transactions-management`: Add URL-driven initial filters prefill behavior for cockpit bridge links.

## Impact

- Affected code:
  - `frontend/src/routes/Dashboard.tsx`
  - new files under `frontend/src/features/dashboard/*`
  - `frontend/src/features/analytics/AnalyticsPage.tsx`
  - `frontend/src/features/budgets/BudgetsPage.tsx`
  - `frontend/src/pages/TransactionsPage.tsx`
  - optional shared UI helpers/components under `frontend/src/components/*`
  - new/updated tests under `frontend/src/features/dashboard`, `frontend/src/routes`, and page suites.
- Affected API contract usage:
  - `GET /analytics/by-month`
  - `GET /analytics/by-category`
  - `GET /transactions` (expense sample for spikes)
- Media-type impact:
  - Preserve success handling with `application/vnd.budgetbuddy.v1+json`
  - Preserve error handling with `application/problem+json`
- Backwards compatibility:
  - No backend contract changes; this is frontend behavior and UX expansion plus URL-prefill interoperability.
