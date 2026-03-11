## MODIFIED Requirements

### Requirement: Savings goals support authenticated CRUD with derived progress fields
The system MUST expose `/savings-goals` CRUD for authenticated users with ownership checks, computed progress metrics, and UTC-aligned deadline validation semantics.

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
- **WHEN** `deadline` is earlier than the current UTC-derived date
- **THEN** API returns `422` canonical `savings-goal-deadline-past`.

#### Scenario: List semantics by status are deterministic
- **WHEN** `GET /savings-goals` is called without status filter
- **THEN** only non-archived `active` goals are returned ordered by `created_at DESC`.
- **AND WHEN** `status=all`
- **THEN** all non-archived goals are returned.

#### Scenario: Goal detail includes computed fields and recent contributions
- **WHEN** `GET /savings-goals/{goal_id}` succeeds
- **THEN** it returns computed `saved_cents`, `remaining_cents`, `progress_pct` and last 10 contributions ordered by `contributed_at DESC`.

### Requirement: Contributions own linked transaction lifecycle
Each contribution MUST create and own a linked generated transaction using UTC-aligned current date semantics.

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

#### Scenario: Contribution transaction date uses UTC current date
- **WHEN** a savings contribution creates its linked transaction
- **THEN** the transaction date SHALL use the current UTC-derived date
- **AND** server-local timezone differences SHALL NOT shift the contribution into a different calendar day.
