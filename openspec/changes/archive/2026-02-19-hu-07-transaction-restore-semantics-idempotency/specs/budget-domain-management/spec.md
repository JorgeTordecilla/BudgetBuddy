## MODIFIED Requirements

### Requirement: Transactions resource behavior
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, archive, and restore semantics.

#### Scenario: Archived transaction is restored via patch
- **WHEN** owner calls `PATCH /transactions/{transaction_id}` with `archived_at=null` for an archived transaction
- **THEN** transaction SHALL be restored and API SHALL return `200` with `Transaction`

#### Scenario: Transaction restore is idempotent
- **WHEN** owner calls `PATCH /transactions/{transaction_id}` with `archived_at=null` for an already-active transaction
- **THEN** API SHALL return `200` and keep active state without conflict

#### Scenario: Restore blocked for non-owner
- **WHEN** authenticated non-owner calls restore patch for another user's transaction
- **THEN** API SHALL return canonical `403` ProblemDetails
