## 1. API and Query Boundaries

- [x] 1.1 Add `getBudget(client, budgetId)` wrapper to `frontend/src/api/budgets.ts` with contract-safe ProblemDetails parsing.
- [x] 1.2 Add/standardize budgets query module `frontend/src/features/budgets/budgetsQueries.ts`.
- [x] 1.3 Implement normalized query keys:
- [x] 1.4 `["budgets", "list", { from, to }]`
- [x] 1.5 `["budgets", "detail", budgetId]`
- [x] 1.6 Ensure create/update/archive mutations invalidate budgets list/detail and analytics query families.

## 2. Budgets UI Refactor and Behavior Alignment

- [x] 2.1 Refactor `BudgetsPage` into orchestration + dedicated components:
- [x] 2.2 `frontend/src/features/budgets/components/BudgetsTable.tsx`
- [x] 2.3 `frontend/src/features/budgets/components/BudgetFormModal.tsx`
- [x] 2.4 Implement draft range vs applied range state and add explicit `Apply` action for month filtering.
- [x] 2.5 Apply deterministic render ordering: month descending, category label ascending tie-breaker.
- [x] 2.6 Preserve responsive table behavior and accessible labels/controls after refactor.

## 3. Error Taxonomy and Validation UX

- [x] 3.1 Extend budget ProblemDetails mapping in `frontend/src/api/problemMessages.ts` for `budget-month-invalid`.
- [x] 3.2 Extend budget ProblemDetails mapping in `frontend/src/api/problemMessages.ts` for `money-amount-*` variants.
- [x] 3.3 Wire field-level inline feedback in budget form for mapped month/limit error types.
- [x] 3.4 Keep canonical handling for `401/403/406/409/429` with deterministic user-facing copy.

## 4. Tests

- [x] 4.1 Add/update unit tests for budget error mapping (`budget-month-invalid`, `money-amount-*`).
- [x] 4.2 Add/update component tests for explicit apply behavior (no refetch on input edit until apply).
- [x] 4.3 Add/update component tests for deterministic sorting (month desc + category asc tie-breaker).
- [x] 4.4 Add/update component tests for backend `400 budget-month-invalid` inline month validation.
- [x] 4.5 Add/update component tests for backend `400 money-amount-*` inline limit validation.
- [x] 4.6 Add/update tests for query key shape and mutation invalidation behavior.

## 5. Verification

- [x] 5.1 Run frontend unit/integration tests: `npm run test`.
- [x] 5.2 Run frontend coverage gate: `npm run test:coverage` and ensure global coverage >= 90%.
- [x] 5.3 Run frontend build verification: `npm run build`.
- [x] 5.4 Perform manual smoke on `/app/budgets`: apply range, create, edit, archive, and error-feedback paths.
