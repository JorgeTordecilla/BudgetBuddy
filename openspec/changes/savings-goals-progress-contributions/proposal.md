## Why

BudgetBuddy already supports transactions, budgets, analytics, rollover, and recurring bills, but it does not yet provide an explicit domain for savings goals with accumulated progress and dedicated contributions. Today, users cannot clearly separate “operational spending” from “goal progress” without manual workarounds.

This change introduces savings goals and linked contributions to:
- define targets (`target_cents`, `deadline`, `status`),
- record real cash-flow contributions,
- track real-time progress (`saved_cents`, `remaining_cents`, `progress_pct`),
- operate clear lifecycle states (`active`, `completed`, `cancelled`, `archived`).

## What Changes

### New backend domain
- Add `SavingsGoal` + `SavingsContribution` with strict `user_id` ownership.
- Add goal CRUD endpoints, lifecycle actions (`/complete`, `/cancel`), contribution endpoints (`POST/DELETE`), and summary endpoint (`/summary`).
- Compute progress fields at read time:
  - `saved_cents = SUM(contributions.amount_cents)`
  - `remaining_cents = target_cents - saved_cents` (may be negative)
  - `progress_pct = round(saved_cents / target_cents * 100, 1)` (may exceed 100)

### Transaction integration
- Each contribution creates an automatic `Transaction` with:
  - `type=expense`
  - goal `account_id` and `category_id`
  - `merchant=goal.name`
  - `note="Savings contribution - <goal.name>"`
- Deleting a contribution deletes its linked transaction.
- No new transaction subtype/enum is introduced.

### Lifecycle and transition rules
- `active` accepts contributions.
- `completed` and `cancelled` reject contributions with `409 savings-goal-not-active`.
- `complete` is idempotent:
  - `active -> completed`
  - `completed -> 200 no changes`
  - `cancelled -> 409 savings-goal-not-active`
- `cancel` is idempotent:
  - `active -> cancelled`
  - `cancelled -> 200 no changes`
  - `completed -> 409 savings-goal-already-completed`
- Auto-complete rules:
  - after contribution when `saved_cents >= target_cents`
  - after `PATCH target_cents` when new target is <= `saved_cents`
- If deleting a contribution drops a goal below target, it may return to `active`.

### Frontend
- Add `/app/savings` route in AppShell.
- Add list with progress bar, status filters, KPIs, badges, and explicit zero-state.
- Add goal detail with recent contributions.
- Add modals for create goal and add contribution.
- Use React Query invalidations for deterministic UI refresh.

### New canonical errors
- `savings-goal-invalid-target` (422)
- `savings-goal-category-type-mismatch` (409)
- `savings-goal-deadline-past` (422)
- `savings-goal-not-active` (409)
- `savings-contribution-invalid-amount` (422)
- `savings-goal-already-completed` (409)

## Scope Boundaries

### Included
- Full goals + contributions + summary domain.
- OpenAPI contract updates and canonical ProblemDetails catalog entries.
- Backend coverage SG-B-01..SG-B-21 and frontend coverage SG-F-01..SG-F-15.

### Not included
- New `Transaction` types/subtypes.
- Advanced historical reporting beyond goal detail + summary.
- Account transfer workflows or double-entry ledger behavior.

## Impact

- Backend: migration `0008`, new models/schemas/router, OpenAPI updates, tests.
- Frontend: new API/types/components/page/tests and AppShell nav update.
- Quality gates: preserve existing standards (`pytest`, `npm run test`, `npm run test:coverage`, `npm run build`).
