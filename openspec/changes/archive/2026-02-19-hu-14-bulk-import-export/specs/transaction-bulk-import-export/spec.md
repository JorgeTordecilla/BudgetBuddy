## ADDED Requirements

### Requirement: Bulk transaction import endpoint
The backend MUST provide `POST /transactions/import` for authenticated users to submit transaction batches and receive deterministic aggregate and row-level outcomes.

#### Scenario: Import request with JSON items succeeds
- **WHEN** an authenticated user sends `POST /transactions/import` with a valid `TransactionImportRequest` body and acceptable media types
- **THEN** the API SHALL return `200` with `TransactionImportResult` containing `created_count`, `failed_count`, and `failures[]`

#### Scenario: Import request enforces batch size limit
- **WHEN** a client sends more than the configured maximum number of import items
- **THEN** the API SHALL reject the request with canonical validation `400` ProblemDetails

#### Scenario: Import request requires authentication
- **WHEN** `POST /transactions/import` is called without a valid bearer token
- **THEN** the API SHALL return canonical `401` ProblemDetails

### Requirement: Per-item business rule enforcement during import
Each imported row MUST be validated using the same domain rules as single-transaction writes.

#### Scenario: Imported row applies ownership and archived checks
- **WHEN** an import item references a non-owned or archived account/category
- **THEN** that row SHALL fail with a sanitized failure entry and SHALL NOT bypass domain conflict rules

#### Scenario: Imported row applies category/type compatibility checks
- **WHEN** an import item has `type` incompatible with effective category type
- **THEN** that row SHALL fail with a deterministic mismatch error in `failures[]`

#### Scenario: Imported row applies money invariants
- **WHEN** an import item violates `amount_cents` integer/sign/safe-bound invariants or currency consistency rules
- **THEN** that row SHALL fail with canonical validation semantics and without internal implementation leakage

### Requirement: Import execution mode semantics
The import flow MUST support deterministic execution semantics for all-or-nothing and partial-accept processing modes.

#### Scenario: All-or-nothing rolls back batch on any failure
- **WHEN** import executes in all-or-nothing mode and at least one item fails validation or business rules
- **THEN** no items SHALL be persisted and result counters SHALL report zero created rows

#### Scenario: Partial-accept persists valid rows only
- **WHEN** import executes in partial-accept mode with mixed valid and invalid rows
- **THEN** valid rows SHALL be persisted, invalid rows SHALL be reported in `failures[]`, and counters SHALL match persisted/failure totals exactly

### Requirement: Export transactions as streamed CSV
The backend MUST provide `GET /transactions/export` returning `text/csv` and stream results to avoid unbounded memory growth.

#### Scenario: Export returns CSV with deterministic header
- **WHEN** an authenticated user calls `GET /transactions/export` with supported filters
- **THEN** the API SHALL return `200` with `Content-Type: text/csv` and a deterministic header row

#### Scenario: Export applies same filtering semantics as transaction list
- **WHEN** `from`, `to`, `type`, `account_id`, and `category_id` query parameters are provided
- **THEN** the exported rows SHALL match the same effective predicate semantics as `GET /transactions`

#### Scenario: Export streams without full in-memory materialization
- **WHEN** the export dataset is large
- **THEN** response generation SHALL stream CSV chunks and SHALL NOT require loading the full dataset into memory before first byte
