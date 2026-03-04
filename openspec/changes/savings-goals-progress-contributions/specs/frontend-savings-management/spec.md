## ADDED Requirements

### Requirement: Savings route is available under authenticated AppShell
The frontend MUST expose `/app/savings` under the existing auth guard and AppShell navigation.

#### Scenario: Authenticated navigation renders savings page
- **WHEN** authenticated user navigates to `/app/savings`
- **THEN** savings UI renders with nav active.

#### Scenario: Unauthenticated navigation is blocked
- **WHEN** unauthenticated access targets `/app/savings`
- **THEN** existing auth guard behavior is applied.

### Requirement: Savings list shows progress, status badges, and filters
Savings list MUST render progress and lifecycle state clearly with status filter controls.

#### Scenario: Goal cards display progress details
- **WHEN** `GET /savings-goals` returns data
- **THEN** each goal shows name, progress bar, `saved/target`, `remaining`, optional deadline, and status badge.

#### Scenario: Status badges follow frontend-local deadline rules
- **WHEN** goal is `active`
- **THEN** badge is `Active`, `Due soon` (<=30 days), or `Overdue` based on local-device date vs deadline.
- **AND WHEN** status is `completed` or `cancelled`
- **THEN** badge maps to corresponding terminal label.

#### Scenario: Status filter drives API refetch
- **WHEN** user selects `All/Active/Completed/Cancelled`
- **THEN** frontend calls `GET /savings-goals?status=<value>` and refreshes list.

### Requirement: Savings page includes KPI summary
The page MUST render summary KPIs from `/savings-goals/summary`.

#### Scenario: Summary KPIs render from API response
- **WHEN** summary request succeeds
- **THEN** UI shows `Active goals`, `Total saved`, `Total remaining`, and `Overall progress %`.

### Requirement: Goal form enforces target/deadline/category constraints
Create/edit forms MUST enforce client validations aligned with backend rules.

#### Scenario: Target validation blocks invalid submit
- **WHEN** `target_cents <= 0`
- **THEN** submit is blocked with inline validation.

#### Scenario: Past deadline validation blocks invalid submit
- **WHEN** deadline is before local today
- **THEN** submit is blocked with inline validation.

#### Scenario: Category selector is expense-only
- **WHEN** selecting goal category
- **THEN** only expense categories are selectable.

### Requirement: Contribution and status actions update UI without full reload
Contribution add/delete and complete/cancel actions MUST update progress/status reactively.

#### Scenario: Add contribution updates progress and can auto-complete badge
- **WHEN** add contribution succeeds on active goal
- **THEN** progress and totals refresh and badge may switch to `Completed`.

#### Scenario: Delete contribution recalculates progress and may reactivate
- **WHEN** delete contribution succeeds
- **THEN** UI recomputes displayed progress/status from refetched data.

#### Scenario: Complete/cancel actions follow backend transitions
- **WHEN** complete or cancel succeeds
- **THEN** badge/status reflects backend state immediately.

### Requirement: Canonical error mapping and responsive behavior are preserved
Savings UI MUST respect canonical ProblemDetails handling and mobile layout constraints.

#### Scenario: ProblemDetails types map to specific messages
- **WHEN** API returns canonical `400/401/403/409/422` savings problems
- **THEN** frontend renders type-specific error feedback.

#### Scenario: Savings screens remain responsive
- **WHEN** rendered on mobile/narrow viewports
- **THEN** page, cards, and modals avoid horizontal overflow.

#### Scenario: Quality gates pass
- **WHEN** feature validation runs
- **THEN** frontend `test`, `test:coverage`, `build` and backend `pytest` pass.
