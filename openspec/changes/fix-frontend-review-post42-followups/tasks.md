## Phase A — Correctness and Consistency

- [x] A1. `AccountsPage`: remove local `toLocalProblem` copy and import shared helper from `@/lib/problemDetails`.
- [x] A2. `AccountsPage`: render `initial_balance_cents` with `formatCents(currencyCode, ...)` in desktop and mobile views.
- [x] A3. `TransactionsPage`: change amount guards from `if (!amount)` to `if (amount === null)` in create/edit payload builders.
- [x] A4. `AppShell`: change quick-create amount guard from `if (!amount)` to `if (amount === null)`.
- [x] A5. `TransactionsPage`: convert `openCreateModal` to `useCallback` and keep effect deps stable.
- [x] A6. `TransactionsPage`: include required callback deps in `rows` and `mobileCards` `useMemo` dependency arrays.
- [x] A7. `BudgetsPage`: migrate categories query key to `optionQueryKeys.categories(...)` with normalized params.

## Phase B — AppShell Query Architecture

- [x] B1. Replace AppShell quick-transaction options `Promise.all` loading pattern with React Query `useQuery` hooks.
- [x] B2. Use shared `optionQueryKeys` for AppShell option queries.
- [x] B3. Ensure modal-open flow consumes cached data when available and avoids redundant fetch bursts.

## Tests

- [x] T1. Update/add Transactions tests for amount null-check semantics and callback/dependency-sensitive behavior.
- [x] T2. Update/add Budgets tests for normalized categories query key usage.
- [x] T3. Update/add Accounts tests for formatted initial balance rendering and shared problem helper path.
- [x] T4. Update/add AppShell tests for cache-backed option loading behavior.
- [x] T5. Run targeted tests for modified suites.
- [x] T6. Run `npm run build` in `frontend`.

## Scope Guard

- [x] S1. No backend endpoints, OpenAPI schema, or media-type contract changes.
- [x] S2. Keep Phase A and Phase B commits separable to simplify review and rollback.

