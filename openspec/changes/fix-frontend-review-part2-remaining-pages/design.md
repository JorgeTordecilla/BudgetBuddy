## Context

This change is a targeted frontend stabilization pass over transactions, savings, and analytics pages. Scope is limited to:

1. correctness fixes flagged as urgent in review, and
2. low-risk maintainability improvements that reduce future regression probability.

No API contract changes are introduced.

## Decisions

### 1) Transactions deep-link effect must be dependency-complete

- Problem: `openCreateModal` is called in a `useEffect` but omitted from dependencies.
- Decision: include `openCreateModal` in the effect dependency list.
- Rationale: preserves `react-hooks/exhaustive-deps` correctness and avoids stale-closure risk if `openCreateModal` later captures state.

### 2) Savings delete contribution must surface failures

- Problem: `deleteContribution` uses `try/finally` without `catch`, so mutation rejections can propagate without user feedback.
- Decision: add `catch (error) { setFormProblem(error) }` before `finally`.
- Rationale: aligns with existing page-level mutation error pattern and keeps ProblemDetails UX deterministic.

### 3) Analytics impulse-summary rendering should avoid JSX IIFE

- Problem: JSX IIFE in `AnalyticsPage` reduces readability and test ergonomics.
- Decision: precompute `impulseSummaryContent` before return (or extract local subcomponent) and render that variable.
- Rationale: same behavior, clearer render tree, easier assertions in tests.

### 4) Transactions options query keys should follow resource-oriented conventions

- Problem: `["accounts-options"]`, `["categories-options"]`, `["income-sources-options"]` diverge from resource keys used elsewhere, reducing cache reuse.
- Decision: standardize to resource-based keys with normalized params (for example `["accounts", { includeArchived: false, limit: 100 }]` pattern family).
- Rationale: better cross-page cache reuse and deterministic invalidation semantics.

### 5) Local ProblemDetails wrapping should be shared

- Problem: `toLocalProblem` is duplicated across pages.
- Decision: move to shared utility and import from all touched pages.
- Rationale: single source of truth for `ApiProblemError` wrapper defaults (`httpStatus`, `requestId`, `retryAfter`).

## Out of Scope

- Full query-key migration across all pages/features.
- Structural changes to API client behavior.
- Backend changes to endpoints or ProblemDetails payload schema.

## Risks and Mitigations

- **Risk**: query-key normalization may unintentionally mix caches if params differ.
  - **Mitigation**: include explicit param object in keys and keep query function params matched.
- **Risk**: effect dependency change could alter modal open timing.
  - **Mitigation**: retain existing guard `searchParams.get("action") === "new"` and URL param cleanup.
- **Risk**: error catch could duplicate toasts/messages if global handlers also fire.
  - **Mitigation**: preserve existing `meta: { skipGlobalErrorToast: true }` mutation behavior.

## Verification Strategy

- Targeted tests:
  - transactions deep-link action behavior
  - savings delete contribution error path
  - analytics impulse-summary rendering states
- Safety checks:
  - `npm run test -- --run src/pages/TransactionsPage.test.tsx src/pages/SavingsPage.test.tsx src/features/analytics/AnalyticsPage.test.tsx`
  - `npm run build`
