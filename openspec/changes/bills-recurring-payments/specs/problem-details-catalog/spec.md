## ADDED Requirements

### Requirement: Canonical bill ProblemDetails identities are documented
The ProblemDetails catalog MUST include stable canonical identities for recurring-bill error paths.

#### Scenario: Catalog includes bill category mismatch
- **WHEN** catalog entries are reviewed
- **THEN** it SHALL include `type=https://api.budgetbuddy.dev/problems/bill-category-type-mismatch`, title `Bill category must be of type expense`, status `409`.

#### Scenario: Catalog includes bill due day invalid
- **WHEN** catalog entries are reviewed
- **THEN** it SHALL include `type=https://api.budgetbuddy.dev/problems/bill-due-day-invalid`, title `Bill due day must be between 1 and 28`, status `422`.

#### Scenario: Catalog includes bill already paid
- **WHEN** catalog entries are reviewed
- **THEN** it SHALL include `type=https://api.budgetbuddy.dev/problems/bill-already-paid`, title `Bill already paid for this month`, status `409`.

#### Scenario: Catalog includes bill inactive for month
- **WHEN** catalog entries are reviewed
- **THEN** it SHALL include `type=https://api.budgetbuddy.dev/problems/bill-inactive-for-month`, title `Bill is inactive for this month`, status `409`.

### Requirement: Runtime bill errors map exactly to canonical catalog
Runtime bill endpoint failures MUST emit ProblemDetails that match documented identities.

#### Scenario: Bills validation and conflict paths are canonical
- **WHEN** bills endpoints reject requests for type mismatch, invalid due day, duplicate payment, or inactive-month payment
- **THEN** runtime payloads SHALL match catalog `type`, `title`, and `status` exactly.
