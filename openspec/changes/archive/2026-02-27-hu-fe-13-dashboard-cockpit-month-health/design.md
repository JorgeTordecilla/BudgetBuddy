## Context

The current dashboard route is a placeholder and does not expose month-level financial health. The frontend already has contract-safe analytics and transactions clients, auth/session guards, and global ProblemDetails UX. This change composes those existing pieces into a cockpit page that prioritizes quick status visibility and actionable navigation.

The cockpit must remain endpoint-light and rely on existing APIs:
- `GET /analytics/by-month` for KPI totals.
- `GET /analytics/by-category` for budget-based overrun alerts.
- `GET /transactions` expense sample for deterministic spike detection.

## Goals / Non-Goals

**Goals:**
- Replace placeholder `/app/dashboard` with a month-health cockpit.
- Provide deterministic KPI cards for income, expense, net, and budget progress.
- Show actionable alerts (over-budget and spikes) with clear bridge CTAs.
- Provide primary in-view actions for common workflows (add transaction, budgets, analytics).
- Keep loading/empty/error states aligned with global ProblemDetails UX.
- Support prefilled bridge navigation via query params in target pages.

**Non-Goals:**
- Full analytics charting parity on dashboard (already handled by `/app/analytics`).
- New backend endpoints for spikes or dashboard aggregates.
- Predictive analytics or push notifications.

## Decisions

1. Month selection and range derivation
- Decision: dashboard state SHALL be month-driven (`YYYY-MM`), with default current UTC month and optional switching over recent months.
- Rationale: matches budget month semantics and keeps bridge query construction deterministic.
- Alternative considered: free-form `from/to` dates; rejected for cockpit complexity and UX noise.

2. KPI source of truth
- Decision: KPIs SHALL use selected-month item from `analytics/by-month` response queried for exact month range.
- Rationale: preserves single contract source and avoids duplicate aggregation logic on frontend.
- Alternative considered: derive from transactions sample; rejected due to sampling bias.

3. Over-budget alerts
- Decision: alert list SHALL derive from `analytics/by-category` rows where `budget_limit_cents > 0` and `budget_spent_cents > budget_limit_cents`.
- Rationale: category response already provides necessary budget overlays.
- Alternative considered: recompute against budgets API; rejected as unnecessary extra calls.

4. Spending spikes heuristic
- Decision: spikes SHALL be computed in frontend from expense sample with rule:
  - sample median over expense `amount_cents`
  - spike when `amount_cents >= 3 * median` and `amount_cents >= minSpikeCents`
  - if sample size < 8, spikes section SHALL show "not enough data"
- Rationale: deterministic, explainable, and endpoint-minimal MVP.
- Alternative considered: mean/std-dev threshold; rejected for outlier sensitivity and explainability.

5. Bridge navigation behavior
- Decision: cockpit links SHALL include explicit query params to preserve context:
  - budgets: `?month=YYYY-MM`
  - transactions: `?from=YYYY-MM-DD&to=YYYY-MM-DD&type=expense` (for spikes CTA)
  - analytics: `?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Rationale: enables one-click drill-down continuity from dashboard context.
- Alternative considered: plain route links without params; rejected due to context loss.

6. URL-prefill interoperability in target pages
- Decision: budgets, transactions, and analytics pages SHALL read supported query params on first render and initialize draft/applied filters consistently.
- Rationale: bridge links are incomplete unless destination pages honor supplied context.
- Alternative considered: dashboard-only links; rejected as non-functional bridge behavior.

## Risks / Trade-offs

- [Risk] Added parallel queries may increase dashboard perceived latency.
  - Mitigation: explicit skeleton/loading states and selective panel rendering while data resolves.
- [Risk] Transactions sample limit may miss true month outliers.
  - Mitigation: document sample-based heuristic and keep rule deterministic; future endpoint can improve precision.
- [Risk] URL-prefill logic can conflict with local defaults.
  - Mitigation: initialize from URL once at mount and preserve existing explicit apply behaviors.

## Migration Plan

1. Add OpenSpec deltas for cockpit capability and target-page prefill interoperability.
2. Implement dashboard queries/helpers/components and replace route placeholder.
3. Implement URL-prefill initialization in analytics, budgets, and transactions pages.
4. Add spike helper unit tests and dashboard render tests (loading/empty/error and key CTA behavior).
5. Verify with `npm run test`, `npm run test:coverage`, and `npm run build` in `frontend`.

## Open Questions

- Should month selector include exactly 6 prior months or be configurable by constant?
- Should spike threshold (`minSpikeCents`) be surfaced as a configurable constant in frontend settings?
