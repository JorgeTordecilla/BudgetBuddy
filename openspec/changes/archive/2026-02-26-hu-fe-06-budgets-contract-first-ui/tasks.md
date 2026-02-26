## 1. Routing and shell integration

- [x] 1.1 Add authenticated `/app/budgets` route wiring in frontend router.
- [x] 1.2 Add `Budgets` navigation entry in `AppShell`.
- [x] 1.3 Add route-level test proving `/app/budgets` renders under `RequireAuth` + `AppShell`.

## 2. API layer and contract handling

- [x] 2.1 Add `src/api/budgets.ts` wrappers for list/create/update/archive with typed payloads.
- [x] 2.2 Ensure budgets wrappers use shared client semantics (vendor media types, bearer auth, `credentials: include`, ProblemDetails parsing).
- [x] 2.3 Add deterministic ProblemDetails mapping helper for budgets conflicts (`budget-duplicate`, `category-archived`, `category-not-owned`).

## 3. Budgets page and forms

- [x] 3.1 Implement budgets page UI with month-range filters (`from`, `to`) and explicit loading/empty/error states.
- [x] 3.2 Implement create/edit budget modal with fields: `month`, `category_id`, and limit input converted to `limit_cents`.
- [x] 3.3 Implement archive confirmation dialog and delete flow.
- [x] 3.4 Implement list refresh/invalidation behavior for create/update/archive mutations using React Query keys.
- [x] 3.5 Load categories with `include_archived=false` and show both income and expense options.

## 4. Validation and UX behavior

- [x] 4.1 Add client-side validation for `YYYY-MM`, required fields, and `from <= to`.
- [x] 4.2 Add client-side validation for positive limit and safe upper bound before conversion to cents.
- [x] 4.3 Surface canonical ProblemDetails banner/toast (`400/401/403/406/409/429`) with deterministic fallback titles.
- [x] 4.4 Ensure keyboard-accessible interactions for budget form and archive confirmation dialogs.

## 5. Tests and verification

- [x] 5.1 Add unit tests for month validation and `limit -> limit_cents` conversion.
- [x] 5.2 Add API wrapper tests for budgets endpoints and ProblemDetails propagation.
- [x] 5.3 Add integration-style page test for `409 budget-duplicate` feedback rendering.
- [x] 5.4 Run `npm run test` in `frontend/`.
- [x] 5.5 Run `npm run test:coverage` in `frontend/` and ensure global coverage >= 90%.
- [x] 5.6 Run `npm run build` in `frontend/`.
