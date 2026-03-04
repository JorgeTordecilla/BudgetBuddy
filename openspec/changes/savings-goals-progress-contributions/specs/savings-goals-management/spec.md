## ADDED Requirements

### Requirement: Savings goals support authenticated CRUD with derived progress fields
The system MUST expose `/savings-goals` CRUD for authenticated users with ownership checks and computed progress metrics.

#### Scenario: Create valid savings goal
- **WHEN** `POST /savings-goals` receives valid owned `account_id`, owned expense `category_id`, and `target_cents > 0`
- **THEN** API returns `201` with `status=active`, `saved_cents=0`, `remaining_cents=target_cents`, `progress_pct=0.0`.

#### Scenario: Invalid target is rejected
- **WHEN** `target_cents <= 0`
- **THEN** API returns `422` canonical `savings-goal-invalid-target`.

#### Scenario: Income category is rejected
- **WHEN** `category_id` points to an `income` category
- **THEN** API returns `409` canonical `savings-goal-category-type-mismatch`.

#### Scenario: Past deadline is rejected
- **WHEN** `deadline` is earlier than server today
- **THEN** API returns `422` canonical `savings-goal-deadline-past`.

#### Scenario: List semantics by status are deterministic
- **WHEN** `GET /savings-goals` is called without status filter
- **THEN** only non-archived `active` goals are returned ordered by `created_at DESC`.
- **AND WHEN** `status=all`
- **THEN** all non-archived goals are returned.

#### Scenario: Goal detail includes computed fields and recent contributions
- **WHEN** `GET /savings-goals/{goal_id}` succeeds
- **THEN** it returns computed `saved_cents`, `remaining_cents`, `progress_pct` and last 10 contributions ordered by `contributed_at DESC`.

### Requirement: Savings goal status transitions are explicit and idempotent
Status changes MUST follow deterministic transition rules.

#### Scenario: Complete endpoint is idempotent
- **WHEN** `POST /savings-goals/{goal_id}/complete` is called on an already completed goal
- **THEN** API returns `200` with no state change.

#### Scenario: Complete on cancelled goal is rejected
- **WHEN** complete endpoint is called on `cancelled`
- **THEN** API returns `409` canonical `savings-goal-not-active`.

#### Scenario: Cancel endpoint is idempotent
- **WHEN** `POST /savings-goals/{goal_id}/cancel` is called on an already cancelled goal
- **THEN** API returns `200` with no state change.

#### Scenario: Cancel on completed goal is rejected
- **WHEN** cancel endpoint is called on `completed`
- **THEN** API returns `409` canonical `savings-goal-already-completed`.

#### Scenario: Target reduction can auto-complete
- **WHEN** `PATCH /savings-goals/{goal_id}` sets `target_cents >= 1` and `saved_cents >= target_cents`
- **THEN** goal is updated and status becomes `completed` automatically.

### Requirement: Contributions own linked transaction lifecycle
Each contribution MUST create and own a linked generated transaction.

#### Scenario: Create contribution generates transaction
- **WHEN** `POST /savings-goals/{goal_id}/contributions` succeeds for an `active` goal with `amount_cents > 0`
- **THEN** API creates one `SavingsContribution` and one linked `Transaction` (`type=expense`, goal account/category, `merchant=goal.name`).

#### Scenario: Contribution auto-completes goal
- **WHEN** new contribution causes `saved_cents >= target_cents`
- **THEN** goal status automatically changes to `completed`.

#### Scenario: Non-active goal rejects contributions
- **WHEN** goal status is `completed` or `cancelled`
- **THEN** contribution create returns `409` canonical `savings-goal-not-active`.

#### Scenario: Invalid contribution amount is rejected
- **WHEN** `amount_cents <= 0`
- **THEN** API returns `422` canonical `savings-contribution-invalid-amount`.

#### Scenario: Deleting contribution deletes linked transaction and recalculates status
- **WHEN** `DELETE /savings-goals/{goal_id}/contributions/{contribution_id}` succeeds
- **THEN** contribution and linked transaction are deleted, totals are recalculated,
- **AND** a goal completed only by that contribution may return to `active`.

#### Scenario: Missing contribution delete is not idempotent
- **WHEN** contribution id does not exist for the goal/user
- **THEN** API returns `404`.

### Requirement: Savings endpoints enforce auth and ownership
All savings-goal endpoints MUST enforce the same auth and ownership contract used by protected resources.

#### Scenario: Unauthenticated request fails
- **WHEN** any `/savings-goals` endpoint is called without valid auth
- **THEN** API returns canonical `401`.

#### Scenario: Cross-user access fails
- **WHEN** user attempts operations on another user's goal/contribution/account/category
- **THEN** API returns canonical `403`.

### Requirement: Savings summary aggregates non-archived goals
The system MUST provide `/savings-goals/summary` with deterministic aggregate metrics for non-archived goals.

#### Scenario: Summary response includes canonical aggregates
- **WHEN** `GET /savings-goals/summary` succeeds
- **THEN** response includes `active_count`, `completed_count`, `total_target_cents`, `total_saved_cents`, `total_remaining_cents`, `overall_progress_pct`.
