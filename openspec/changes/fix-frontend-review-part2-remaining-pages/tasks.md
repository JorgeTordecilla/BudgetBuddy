## 1. Urgent Correctness Fixes

- [x] 1.1 In `frontend/src/pages/TransactionsPage.tsx`, include `openCreateModal` in the `useEffect` dependency array for the `action=new` flow.
- [x] 1.2 In `frontend/src/pages/SavingsPage.tsx`, add `catch (error) { setFormProblem(error) }` to `deleteContribution` before `finally`.

## 2. Maintainability Improvements (Low Risk)

- [x] 2.1 In `frontend/src/features/analytics/AnalyticsPage.tsx`, remove JSX IIFE in "Impulse behavior" and render precomputed content (or local subcomponent) with equivalent behavior.
- [x] 2.2 Standardize transactions option query keys to resource-oriented keys aligned with cross-page conventions and normalized params.
- [x] 2.3 Extract duplicated `toLocalProblem` helper into a shared module and migrate at least `TransactionsPage`, `BudgetsPage`, and `AppShell` to import it.

## 3. Tests and Verification

- [x] 3.1 Update/add tests for transactions `action=new` behavior to ensure deterministic modal opening and query-param cleanup.
- [x] 3.2 Update/add tests for savings delete-contribution failure path to assert user-visible error handling.
- [x] 3.3 Update analytics tests to validate impulse-summary rendering states after IIFE removal.
- [x] 3.4 Run targeted tests:
  - `npm run test -- --run src/pages/TransactionsPage.test.tsx src/pages/SavingsPage.test.tsx src/features/analytics/AnalyticsPage.test.tsx`
- [x] 3.5 Run `npm run build` in `frontend`.

## 4. Scope Guard

- [x] 4.1 Do not modify backend endpoints, OpenAPI schemas, or media-type contracts.
- [x] 4.2 Keep query-key standardization scoped to touched pages in this change (no global migration).
