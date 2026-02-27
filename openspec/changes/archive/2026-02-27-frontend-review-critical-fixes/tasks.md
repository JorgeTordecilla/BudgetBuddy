## 1. Session Resilience and Auth Routing

- [x] 1.1 Update `frontend/src/api/client.ts` logout path to clear local session in a deterministic `finally` flow, preserving existing contract-first transport behavior.
- [x] 1.2 Update `frontend/src/auth/AuthContext.tsx` logout orchestration to ensure protected query cache is cleared and auth state cannot remain stale after logout failures.
- [x] 1.3 Update `frontend/src/routes/AppShell.tsx` logout handling so navigation to `/login` remains deterministic from `/app/*` routes.
- [x] 1.4 Update `frontend/src/routes/Login.tsx` restored-session redirect logic to honor `location.state.from` with safe fallback to `/app/dashboard`.
- [x] 1.5 Add/adjust route and auth tests for logout failure fallback and restored-session redirect destination behavior.

## 2. URL Query State Synchronization

- [x] 2.1 Implement shared parse/normalize utilities for route query state synchronization (`from`, `to`, `type`, `account_id`, `category_id`, `month`) with safe defaults.
- [x] 2.2 Update `frontend/src/pages/TransactionsPage.tsx` to resync filters from search params after mount and persist applied filters back to URL deterministically.
- [x] 2.3 Update `frontend/src/features/analytics/AnalyticsPage.tsx` to keep draft/applied range aligned with URL changes and write normalized range params on apply.
- [x] 2.4 Update `frontend/src/features/budgets/BudgetsPage.tsx` to keep month/range controls aligned with URL query changes and persist applied range in URL.
- [x] 2.5 Add integration tests that validate deep-link initialization, back/forward resync, and deterministic query serialization across transactions/analytics/budgets.

## 3. Error UX Hardening and Safe Operational Disclosure

- [x] 3.1 Centralize auth/session ProblemDetails constants and mappings in error taxonomy modules used by API client and route-level UX.
- [x] 3.2 Remove or gate login-screen operational endpoint disclosure (`API_BASE_URL`) outside development runtime.
- [x] 3.3 Ensure auth/logout failure feedback is non-blocking, request-id-aware, and consistent with existing global error presentation rules.
- [x] 3.4 Add tests covering canonical auth error mapping paths and non-development login rendering behavior.

## 4. Modal and Dialog Accessibility Foundation

- [x] 4.1 Refactor shared modal/dialog primitives (`ModalForm`, `ConfirmDialog`, and dependent flows) to enforce focus trap, escape behavior, and focus restore on close.
- [x] 4.2 Ensure dialog semantics include complete accessible labeling and keyboard traversal expectations for both desktop and mobile layouts.
- [x] 4.3 Update modal/dialog component tests to verify keyboard and assistive-technology behavior rather than brittle markup assumptions.
- [x] 4.4 Run targeted UI regression checks for transaction/account/category/budget forms and confirmation dialogs after accessibility refactor.

## 5. Query Cache and Invalidation Consistency

- [x] 5.1 Audit and align mutation success handlers to keep invalidations domain-scoped (`transactions`, `analytics`, `budgets`) and avoid unnecessary broad invalidations.
- [x] 5.2 Validate no retry storms are introduced (respect existing `retry: false` defaults and explicit retry semantics for auth refresh behavior).
- [x] 5.3 Add regression tests for cache refresh behavior after create/update/archive/restore operations in impacted pages.

## 6. Verification and Quality Gates

- [x] 6.1 Execute frontend unit and integration test suite from `frontend` with `npm run test`.
- [x] 6.2 Execute frontend coverage verification with `npm run test:coverage` and confirm thresholds remain satisfied.
- [x] 6.3 Execute production build verification with `npm run build`.
- [x] 6.4 Run backend verification from `backend` with `.venv` activated (`.venv/Scripts/python.exe -m pytest`) to confirm no cross-layer regressions.
- [x] 6.5 Run OpenSpec validation for this change and confirm all artifacts are complete and consistent before implementation/archive steps.
