## Context

Savings goals require semantics different from day-to-day spending: target amount, accumulated progress, and explicit lifecycle transitions. The implementation must preserve canonical media-type and ProblemDetails behavior while reusing the current transaction model without adding new transaction types.

## Goals / Non-Goals

### Goals
- Model `SavingsGoal` and `SavingsContribution` with ownership and soft-delete lifecycle.
- Keep `saved_cents` fully derived (never persisted as a physical column).
- Guarantee atomic contribution <-> transaction side effects.
- Support explicit and idempotent manual transitions (`complete`, `cancel`).
- Support automatic completion on contribution and on target reduction.

### Non-Goals
- Do not change base `Transaction` schema (`type=expense` remains).
- Do not add advanced historical reporting or transfer workflows.

## Decisions

### D1. Contribution transactions use `type=expense`
Each contribution is a real cash outflow from an account. Using `expense` avoids high-cost cross-cutting changes in analytics/CSV/import/tests. Classification is provided by a dedicated expense category selected by the user.

### D2. Progress is derived at read time
`saved_cents`, `remaining_cents`, and `progress_pct` are computed on read through contribution aggregation.

Benefits:
- avoids drift from partial writes,
- removes synchronization complexity,
- keeps contributions as the single source of truth.

### D3. Deterministic lifecycle transitions
States: `active`, `completed`, `cancelled`.

| Current state | complete | cancel | new contribution |
|---|---|---|---|
| active | -> completed | -> cancelled | allowed |
| completed | 200 no-op | 409 already-completed | 409 not-active |
| cancelled | 409 not-active | 200 no-op | 409 not-active |

### D4. `PATCH target_cents` rules
- `target_cents < 1` -> `422 savings-goal-invalid-target`.
- If `saved_cents >= new_target`, set status to `completed` automatically.
- Otherwise, keep current status unchanged.

### D5. Contribution delete is non-idempotent
- If contribution does not exist: `404`.
- If contribution exists and belongs to user: delete contribution + linked transaction, then recalculate status.

### D6. Deadline handling
- Backend validates deadline is not in the past on create/update (`422 savings-goal-deadline-past`).
- Frontend computes `Due soon/Overdue` badge variants using local device date for presentation only.

## Data Model

### `savings_goals`
- `id`, `user_id`, `name`, `target_cents`, `account_id`, `category_id`, `deadline`, `note`, `status`, `archived_at`, `created_at`, `updated_at`
- constraints:
  - `target_cents > 0`
  - `status in ('active','completed','cancelled')`

### `savings_contributions`
- `id`, `goal_id`, `user_id`, `amount_cents`, `transaction_id`, `note`, `contributed_at`
- constraints:
  - `amount_cents > 0`
- index:
  - `(goal_id, contributed_at)`

## API Design Notes

- `GET /savings-goals` defaults to non-archived `active` goals only.
- `status=all` returns non-archived `active + completed + cancelled` goals.
- `GET /savings-goals/{id}` returns computed fields + latest 10 contributions (DESC).
- `GET /savings-goals/summary` aggregates non-archived goals only.

## Risks / Trade-offs

- Modeling contributions as `expense` affects expense analytics (intentional and explicit).
- Derived reads may increase query cost; mitigated with indexes and efficient aggregates.
- Automatic transition logic requires strict tests to prevent inconsistent states.

## Verification Strategy

- Backend integration coverage for SG-B-01..SG-B-21.
- OpenAPI contract coverage for paths/schemas/examples/canonical errors.
- Frontend UI/API coverage for SG-F-01..SG-F-15.
- Full backend and frontend quality-gate execution.
