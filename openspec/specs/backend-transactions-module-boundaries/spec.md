## Purpose
Define explicit modular boundaries for the backend transactions domain while preserving contract-first API behavior.

## Requirements

### Requirement: Transactions router boundaries are explicitly modular
The backend MUST separate transaction HTTP transport concerns from domain logic concerns, with dedicated modules for validation, import orchestration, import execution, CSV export, and cursor pagination.

#### Scenario: Router delegates business logic to domain modules
- **WHEN** a transactions endpoint handles a request
- **THEN** the endpoint handler SHALL orchestrate request/response mapping and delegate domain behavior to dedicated transaction modules.
- **AND** domain rules SHALL NOT be implemented inline as new complex blocks inside the router module.

#### Scenario: Import workflow concerns are isolated from generic transaction endpoints
- **WHEN** import job lifecycle behavior is changed
- **THEN** changes SHALL be localized to import-related transaction modules.
- **AND** list/create/update/delete transaction endpoint handlers SHALL NOT require unrelated import orchestration changes.

### Requirement: Transactions module decomposition preserves contract-first API behavior
The backend MUST preserve the existing OpenAPI contract, media types, and ProblemDetails semantics for transaction and import/export endpoints after modular decomposition.

#### Scenario: Transaction endpoints keep existing response contract
- **WHEN** clients call `/transactions` and `/transactions/{id}`
- **THEN** response schemas, status codes, and vendor/problem media types SHALL remain contract-compatible with current OpenAPI definitions.

#### Scenario: Import/export endpoints keep existing response contract
- **WHEN** clients call `/transactions/import/*` and `/transactions/export`
- **THEN** endpoint behavior SHALL remain contract-compatible with current OpenAPI definitions.
- **AND** error responses SHALL continue using canonical ProblemDetails fields (`type`, `title`, `status`).

