## ADDED Requirements

### Requirement: Analytics archived-transaction policy is explicit and deterministic
Analytics totals MUST apply one explicit policy for archived transactions.

#### Scenario: Archived transactions are excluded from analytics totals
- **WHEN** analytics endpoints compute totals by month or category
- **THEN** archived transactions SHALL be excluded from aggregates by default policy

#### Scenario: Analytics policy is stable under archive toggling
- **WHEN** a transaction is archived or restored
- **THEN** analytics totals SHALL deterministically reflect exclusion on archive and inclusion on restore
