## ADDED Requirements

### Requirement: Savings canonical ProblemDetails identities are cataloged
ProblemDetails catalog MUST define stable canonical identities for savings-goal domain validation and conflict paths.

#### Scenario: Catalog includes savings target invalid
- **WHEN** catalog is reviewed
- **THEN** it includes `type=https://api.budgetbuddy.dev/problems/savings-goal-invalid-target`, title `Savings goal target must be greater than zero`, status `422`.

#### Scenario: Catalog includes savings category mismatch
- **WHEN** catalog is reviewed
- **THEN** it includes `type=https://api.budgetbuddy.dev/problems/savings-goal-category-type-mismatch`, title `Savings goal category must be of type expense`, status `409`.

#### Scenario: Catalog includes savings deadline past
- **WHEN** catalog is reviewed
- **THEN** it includes `type=https://api.budgetbuddy.dev/problems/savings-goal-deadline-past`, title `Savings goal deadline cannot be in the past`, status `422`.

#### Scenario: Catalog includes savings goal not active
- **WHEN** catalog is reviewed
- **THEN** it includes `type=https://api.budgetbuddy.dev/problems/savings-goal-not-active`, title `Savings goal is not active and cannot receive contributions`, status `409`.

#### Scenario: Catalog includes contribution invalid amount
- **WHEN** catalog is reviewed
- **THEN** it includes `type=https://api.budgetbuddy.dev/problems/savings-contribution-invalid-amount`, title `Contribution amount must be greater than zero`, status `422`.

#### Scenario: Catalog includes already completed transition conflict
- **WHEN** catalog is reviewed
- **THEN** it includes `type=https://api.budgetbuddy.dev/problems/savings-goal-already-completed`, title `Savings goal is already completed`, status `409`.

### Requirement: Runtime savings errors match canonical catalog
Runtime savings endpoint failures MUST emit exact cataloged `type/title/status` triples.

#### Scenario: Savings runtime and catalog stay aligned
- **WHEN** savings create/patch/complete/cancel/contribution operations fail on modeled rules
- **THEN** emitted ProblemDetails match catalog entries exactly.
