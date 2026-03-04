## Why

The frontend currently exposes several money fields as raw `*_cents` inputs, which leads users to enter major-unit values (for example `4,000,000 COP`) that are interpreted as cents and rendered as `40,000 COP`. This causes trust issues in analytics and requires a UX contract that accepts user-facing money amounts while preserving backend integer-cents invariants.

## What Changes

- Replace raw cents UX in relevant frontend forms with major-unit money inputs using user currency context.
- Keep API payloads in integer cents by adding deterministic conversion/parsing before request submission.
- Standardize currency formatting and display across transactions, income sources, analytics, and dashboard summaries.
- Add base-currency handling for currently supported user currencies (`USD`, `COP`, `EUR`, `MXN`) and deterministic validation feedback.
- Add frontend tests for conversion, rendering, and error states to prevent regression.

## Capabilities

### New Capabilities
- `frontend-money-input-display-ux`: Shared frontend rules for currency-aware money input/display, normalization, and cents conversion safety.
- `frontend-income-sources-management`: Frontend behavior for income source CRUD UX with major-unit money input and contract-safe cents payload conversion.

### Modified Capabilities
- `frontend-transactions-management`: Update transaction form and list behavior to accept major-unit money input and preserve integer-cents API transport.
- `frontend-analytics-dashboard`: Ensure analytics cards/charts/rows use user currency formatting consistently for expected vs actual income and related totals.

## Impact

- Frontend code:
  - `frontend/src/components/transactions/TransactionForm.tsx`
  - `frontend/src/pages/TransactionsPage.tsx`
  - `frontend/src/pages/IncomeSourcesPage.tsx`
  - `frontend/src/features/analytics/AnalyticsPage.tsx`
  - money utility/helpers under `frontend/src/utils` or shared libs
- Frontend tests:
  - transactions page/component tests
  - analytics page/component tests
  - income sources page/api tests
  - money utility tests for currency-aware parsing/formatting
- API/backends:
  - No endpoint/path/schema changes
  - No media-type changes
  - Backwards compatibility preserved at API contract level
