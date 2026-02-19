## ADDED Requirements

### Requirement: Archived category is blocked for transaction create and patch
Transaction business-rule validation MUST reject any create or patch operation whose effective category is archived.

#### Scenario: Create validates archived category in shared rule path
- **WHEN** transaction create validation runs with `category_id` pointing to an archived category
- **THEN** create SHALL fail with canonical category-archived `409` conflict

#### Scenario: Patch validates archived category in shared rule path
- **WHEN** transaction patch validation resolves a final category that is archived (changed `category_id` or unchanged effective category)
- **THEN** patch SHALL fail with canonical category-archived `409` conflict

#### Scenario: Validation path is consistent between create and patch
- **WHEN** transaction write rules are evaluated for account/category/type constraints
- **THEN** create and patch SHALL use the same centralized business-rule validation behavior
