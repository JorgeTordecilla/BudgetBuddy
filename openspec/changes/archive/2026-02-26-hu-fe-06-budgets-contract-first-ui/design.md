## Context

The frontend already supports authenticated session handling, contract-strict API calls, and React Query-based state for accounts/categories/transactions. Budgets endpoints are available in backend contract and require the same media-type discipline and ProblemDetails semantics.

## Goals / Non-Goals

**Goals:**
- Deliver `/app/budgets` under authenticated shell with month-range filtering.
- Implement list/create/update/archive budget flows using strict contract headers.
- Keep budget mutations deterministic via React Query invalidation.
- Provide explicit loading/empty/error states and conflict-aware ProblemDetails feedback.
- Support responsive and keyboard-accessible interactions for form and archive confirmation.

**Non-Goals:**
- Backend/OpenAPI changes.
- Budget analytics redesign beyond optional query invalidation hooks.
- Bulk budget operations.

## Decisions

1. Route and module boundary
- Decision: Add budgets route under authenticated shell (`/app/budgets`) and group logic under a dedicated budgets feature module.
- Rationale: Keeps parity with existing private-route architecture and prevents cross-feature coupling.
- Alternative: flat page in `src/pages`. Rejected for long-term scalability.

2. Data strategy and query keys
- Decision: Use React Query with `['budgets', { from, to }]` and `['categories', { include_archived: false }]`.
- Rationale: Stable cache keys guarantee predictable refetch behavior when range changes.
- Alternative: manual local fetch orchestration. Rejected due to duplication and higher stale-state risk.

3. Contract-first API wrappers
- Decision: Add `src/api/budgets.ts` thin wrappers (`listBudgets`, `createBudget`, `updateBudget`, `archiveBudget`) reusing shared client semantics.
- Rationale: Centralizes endpoint paths and ProblemDetails parsing, reducing component complexity.
- Alternative: direct fetch in components. Rejected due to drift risk.

4. Money input normalization
- Decision: Budget form accepts decimal UI input and converts to integer `limit_cents` before submit; values MUST be > 0 and max-safe per backend bound.
- Rationale: User-friendly input while preserving integer-only contract.
- Alternative: cents-only raw input. Rejected due to poor UX.

5. Error taxonomy mapping
- Decision: Surface canonical ProblemDetails (`400/401/403/406/409/429`) and explicit domain conflict messages for `budget-duplicate`, `category-archived`, and `category-not-owned`.
- Rationale: Predictable user feedback and easier support triage.
- Alternative: generic error toast for all failures. Rejected due to weak diagnosability.

6. Accessibility and responsive behavior
- Decision: Budget filters/forms/dialogs must remain keyboard-operable (Enter/Escape/Tab flow) and readable on mobile widths.
- Rationale: Aligns with frontend policy-compliance governance and prevents mobile regressions.

## Risks / Trade-offs

- [Risk] Decimal conversion edge cases can produce unexpected cents values. -> Mitigation: unit tests for conversion and invalid precision/zero handling.
- [Risk] Range filtering can leak stale list state. -> Mitigation: parameterized query keys and reset behavior on range change.
- [Risk] Conflict errors may be under-specified by backend detail text. -> Mitigation: map by ProblemDetails type with deterministic fallback titles.
- [Risk] Over-invalidation can increase network chatter. -> Mitigation: scope invalidation to budgets keys in current range (plus optional analytics key only if needed).

## Migration Plan

1. Add budgets route and AppShell navigation entry.
2. Add API wrappers and ProblemDetails mapping helpers for budgets.
3. Build budgets page + create/edit modal + archive confirmation flow.
4. Add unit/integration tests for validations and conflict handling.
5. Run `npm run test`, `npm run test:coverage`, and `npm run build` before apply/verify.

## Open Questions

- Should default `to` month equal `from` month or include a short forward range (e.g., +2 months)?
- Should `429` feedback display `Retry-After` explicitly in the banner when present?
- Should archived budgets be shown in a future toggle if backend adds include-archived semantics for budgets list?
