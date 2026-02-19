## ADDED Requirements

### Requirement: Transaction import endpoint contract mapping
The OpenAPI contract MUST define `POST /transactions/import` request/response media types, schemas, and canonical error mappings.

#### Scenario: Import request and success response are explicit
- **WHEN** `backend/openapi.yaml` is reviewed for `POST /transactions/import`
- **THEN** the operation SHALL define request body schema `TransactionImportRequest` and success schema `TransactionImportResult`

#### Scenario: Import error response mapping is explicit
- **WHEN** import endpoint contract is reviewed
- **THEN** canonical `400`, `401`, `403`, `406`, and applicable `409` responses SHALL be documented with `application/problem+json`

#### Scenario: Import media-type negotiation is explicit
- **WHEN** a client sends unsupported `Content-Type` or unsupported `Accept` for import
- **THEN** the contract SHALL define deterministic rejection behavior with canonical error responses

### Requirement: Transaction export endpoint contract mapping
The OpenAPI contract MUST define `GET /transactions/export` as a CSV-producing endpoint with filter parameters and canonical error mappings.

#### Scenario: Export success media type is CSV
- **WHEN** `backend/openapi.yaml` is reviewed for `GET /transactions/export`
- **THEN** the success response SHALL be documented with `Content-Type: text/csv`

#### Scenario: Export filters are explicitly documented
- **WHEN** export endpoint parameters are reviewed
- **THEN** `from`, `to`, `type`, `account_id`, and `category_id` SHALL be documented with validation expectations aligned to transaction listing semantics

#### Scenario: Export error media type remains ProblemDetails
- **WHEN** export endpoint defines non-2xx responses
- **THEN** error responses SHALL use `application/problem+json` with required `ProblemDetails` fields

### Requirement: Import and export schemas are reusable OpenAPI components
The OpenAPI contract MUST define reusable component schemas for import request/result/failure payloads.

#### Scenario: Import component schemas exist
- **WHEN** OpenAPI components are reviewed
- **THEN** `TransactionImportRequest`, `TransactionImportResult`, and `TransactionImportFailure` SHALL exist and be referenced by `POST /transactions/import`
