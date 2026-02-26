## Context

The frontend already implements authenticated routing, contract-strict API client behavior, and React Query state management for domain screens. Backend analytics endpoints are available and include budget overlay fields in integer cents.

## Goals / Non-Goals

**Goals:**
- Deliver an authenticated analytics page under app shell routing.
- Show monthly trend and category breakdown for a selected date range.
- Surface budget spent vs limit without breaking existing totals semantics.
- Preserve contract correctness (vendor `Accept`, ProblemDetails parsing, auth/refresh behavior).
- Provide explicit loading/empty/error UX and deterministic handling for invalid ranges and rate limits.

**Non-Goals:**
- Backend analytics contract changes.
- Advanced charting library lock-in (simple chart implementation is acceptable).
- CSV exports or drill-down transaction exploration in this HU.

## Decisions

1. Route and navigation
- Decision: Add analytics screen at `/app/analytics` under `RequireAuth` + `AppShell`.
- Rationale: Consistent with existing private-route architecture and session guard behavior.
- Alternative: standalone `/analytics` route. Rejected to avoid parallel private-route patterns.

2. Data model and query keys
- Decision: Use React Query with:
  - `["analytics", "by-month", { from, to }]`
  - `["analytics", "by-category", { from, to }]`
- Rationale: Predictable invalidation and cache partitioning by range and source.
- Alternative: single combined key. Rejected due to weaker granularity and harder refetch control.

3. Fetch interaction model
- Decision: Date inputs update local draft state and fetch occurs on explicit `Apply`.
- Rationale: Prevents excessive requests while editing dates and keeps UX deterministic.
- Alternative: fetch on every change. Rejected due to churn and avoidable 400 responses while input is incomplete.

4. Error taxonomy behavior
- Decision:
  - `400 invalid-date-range` -> inline filter error.
  - `401` -> existing auth recovery/redirect policy.
  - `406` -> deterministic contract error banner.
  - `429` -> deterministic try-later message and optional Retry-After hint.
- Rationale: Consistent user feedback and easier support/debugging.

5. Budget overlay representation
- Decision: Render overlay in both monthly table and category list as:
  - `budget_spent_cents / budget_limit_cents`
  - `% used` only when limit > 0.
  - Fallback label `No budget` when limit is missing or zero.
- Rationale: Avoids divide-by-zero ambiguity and keeps intent obvious.

6. Formatting utilities
- Decision: Add shared helpers for cents and date handling:
  - `formatCents(currencyCode, cents)`
  - `centsToDecimalString(cents)`
  - date range defaults/validators.
- Rationale: Avoid repeated formatting logic and ensure deterministic rendering.

## Risks / Trade-offs

- [Risk] Large date ranges may reduce chart readability. -> Mitigation: keep table fallback and stable sorting.
- [Risk] `429` handling can confuse users if retry timing is unclear. -> Mitigation: show friendly try-later feedback and include Retry-After when present.
- [Risk] Category budget overlay may not exist for all rows. -> Mitigation: explicit `No budget` state.
- [Risk] Query cache fragmentation with many date ranges. -> Mitigation: explicit Apply and bounded date defaults.

## Migration Plan

1. Add route + app-shell navigation for analytics.
2. Add analytics API wrappers and types integration.
3. Add analytics feature module (page + components + query hooks).
4. Add money/date helper utilities.
5. Add tests for utilities and UI error/tab behavior.
6. Run frontend quality gates (`test`, `test:coverage`, `build`).

## Open Questions

- Should the chart default to bars or lines for monthly trend in v1?
- Should `Retry-After` be shown as seconds or human-friendly relative text?
- Should dashboard route (`/app/dashboard`) embed a condensed analytics preview later?
