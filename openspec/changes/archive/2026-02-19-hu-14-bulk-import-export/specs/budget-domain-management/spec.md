## ADDED Requirements

### Requirement: Bulk import reuses transaction domain write rules
Bulk import processing MUST evaluate each item with the same domain invariants and conflict checks enforced by transaction create/patch paths.

#### Scenario: Import item enforces account/category ownership
- **WHEN** an imported row references an account or category not owned by the authenticated user
- **THEN** the row SHALL fail under the same ownership policy as transaction writes

#### Scenario: Import item enforces archived resource conflicts
- **WHEN** an imported row references an archived account or archived category
- **THEN** the row SHALL fail using the same archived-resource conflict semantics as transaction writes

#### Scenario: Import item enforces category-type compatibility
- **WHEN** an imported row has `type` incompatible with the selected category type
- **THEN** the row SHALL fail with the same mismatch rule as transaction writes

#### Scenario: Import item enforces money invariants
- **WHEN** an imported row violates `amount_cents` integer/sign/range invariants or currency consistency
- **THEN** the row SHALL fail with deterministic validation semantics identical to transaction writes

### Requirement: Import result accounting is deterministic
Bulk import results MUST provide deterministic accounting for created and failed rows.

#### Scenario: Mixed batch reports exact counters
- **WHEN** an import batch contains both valid and invalid rows
- **THEN** `created_count` and `failed_count` SHALL equal persisted and failed row totals exactly

#### Scenario: Failure entries are index-addressable
- **WHEN** one or more rows fail during import
- **THEN** each failure SHALL include the source row index and a sanitized message suitable for client troubleshooting

### Requirement: Export dataset semantics match transaction listing filters
Transaction export behavior MUST follow transaction-list domain filtering and ownership constraints.

#### Scenario: Export includes only authenticated user transactions
- **WHEN** `GET /transactions/export` is called with a valid user token
- **THEN** exported rows SHALL be restricted to transactions owned by that user

#### Scenario: Export applies date and dimension filters conjunctively
- **WHEN** export request provides any combination of `from`, `to`, `type`, `account_id`, and `category_id`
- **THEN** the export result SHALL apply all provided filters as a single effective predicate
