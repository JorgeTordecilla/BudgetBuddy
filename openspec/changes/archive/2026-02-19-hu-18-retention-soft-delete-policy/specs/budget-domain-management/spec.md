## ADDED Requirements

### Requirement: Runtime list behavior for archived resources is consistent
Accounts, categories, and transactions list endpoints MUST enforce one archived inclusion policy.

#### Scenario: Default list requests exclude archived resources
- **WHEN** caller omits `include_archived` (or sets it to false)
- **THEN** list responses SHALL exclude archived rows for accounts/categories/transactions

#### Scenario: Explicit include_archived enables archived rows
- **WHEN** caller sets `include_archived=true`
- **THEN** list responses SHALL include archived and non-archived rows for accounts/categories/transactions

### Requirement: Archive state handling is consistent for related behaviors
Runtime behaviors that consume archived resources MUST follow the same archive policy boundaries.

#### Scenario: Resource retrieval remains ownership-scoped regardless archive state
- **WHEN** an owned archived resource is fetched by id
- **THEN** ownership/auth rules SHALL be applied consistently without archive-policy drift

#### Scenario: Import/write paths continue to enforce archived conflicts
- **WHEN** import or write operations reference archived account/category resources where forbidden by domain rules
- **THEN** runtime SHALL return canonical business-rule conflicts consistently
