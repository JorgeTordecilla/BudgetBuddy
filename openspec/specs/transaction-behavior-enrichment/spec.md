## Purpose
Define transaction behavior enrichment semantics for optional mood and impulse context, plus deterministic aggregate behavior.

## Requirements

### Requirement: Transaction behavior enrichment model supports optional mood and impulse state
The system MUST support optional transaction enrichment fields `mood` and `is_impulse` without breaking existing transaction data.

#### Scenario: Existing transactions remain valid without enrichment
- **WHEN** a transaction record has no enrichment values persisted
- **THEN** the system SHALL treat `mood` and `is_impulse` as `null` and continue normal transaction behavior.

#### Scenario: Mood taxonomy is canonical and bounded
- **WHEN** a transaction includes a non-null mood value
- **THEN** the value SHALL be one of `happy`, `neutral`, `sad`, `anxious`, or `bored`.

#### Scenario: Enrichment validation behavior remains stable after module decomposition
- **WHEN** enrichment payload validation logic is moved into dedicated transaction validation modules
- **THEN** accepted and rejected input semantics for `mood` and `is_impulse` SHALL remain equivalent to the existing contract.
- **AND** validation failures SHALL continue to surface canonical ProblemDetails responses.

### Requirement: Impulse behavior aggregates are deterministic by date range
The system MUST provide deterministic date-range aggregation for impulse behavior counters and top impulse categories.

#### Scenario: Counters partition tagged and untagged transactions
- **WHEN** transactions in a date range include mixed `is_impulse` values (`true`, `false`, `null`)
- **THEN** aggregation SHALL return independent counts for impulse, intentional, and untagged partitions.

#### Scenario: Top impulse categories are bounded and ordered
- **WHEN** impulse-tagged transactions exist in multiple categories for a date range
- **THEN** aggregation SHALL return at most five categories ordered by descending impulse count.
