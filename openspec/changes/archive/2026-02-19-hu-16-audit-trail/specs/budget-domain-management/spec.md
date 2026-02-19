## ADDED Requirements

### Requirement: Domain mutation actions emit audit trail events
Account, category, and transaction mutation flows MUST emit audit events for traceability.

#### Scenario: Account mutation actions are audited
- **WHEN** account create, patch, or archive actions succeed
- **THEN** an audit event SHALL be persisted with resource type `account` and the corresponding action

#### Scenario: Category mutation actions are audited
- **WHEN** category create, patch, archive, or restore actions succeed
- **THEN** an audit event SHALL be persisted with resource type `category` and the corresponding action

#### Scenario: Transaction mutation actions are audited
- **WHEN** transaction create, patch, archive, or restore actions succeed
- **THEN** an audit event SHALL be persisted with resource type `transaction` and the corresponding action

### Requirement: Audit emission remains low-overhead and safe
Domain write paths MUST keep audit emission lightweight and free of sensitive payload persistence.

#### Scenario: Audit write is minimal and deterministic per action
- **WHEN** a tracked domain mutation succeeds
- **THEN** the system SHALL persist a single normalized audit event without additional heavy payload capture

#### Scenario: Audit event payload excludes secrets
- **WHEN** domain audit events are stored
- **THEN** event data SHALL exclude token-like, credential-like, and secret-like values
