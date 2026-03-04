## ADDED Requirements

### Requirement: OpenAPI contract includes bills resources and payment lifecycle endpoints
The OpenAPI contract MUST define complete request/response and error mappings for recurring bills operations.

#### Scenario: Bills CRUD paths are documented
- **WHEN** OpenAPI paths are reviewed
- **THEN** contract SHALL include `POST /bills`, `GET /bills`, `PATCH /bills/{bill_id}`, and `DELETE /bills/{bill_id}` with vendor success media type and ProblemDetails error responses.

#### Scenario: Monthly status path is documented
- **WHEN** OpenAPI paths are reviewed
- **THEN** contract SHALL include `GET /bills/monthly-status?month=YYYY-MM` with response schema containing `month`, `summary`, and `items`.

#### Scenario: Payment lifecycle paths are documented
- **WHEN** OpenAPI paths are reviewed
- **THEN** contract SHALL include `POST /bills/{bill_id}/payments` and `DELETE /bills/{bill_id}/payments/{month}` with canonical response and error mappings.

### Requirement: OpenAPI schemas define bill entities and month status payloads
The OpenAPI components section MUST include reusable schemas for bills and payments.

#### Scenario: Bill and payment schemas are present
- **WHEN** OpenAPI components are reviewed
- **THEN** schemas SHALL include `BillCreate`, `BillUpdate`, `BillOut`, `BillPaymentCreate`, and `BillPaymentOut`.

#### Scenario: Monthly status schemas are present
- **WHEN** OpenAPI components are reviewed
- **THEN** schemas SHALL include monthly status item and wrapper structures with summary totals and payment linkage fields.

### Requirement: OpenAPI error mappings include canonical bill problem types
The contract MUST map bill endpoints to the canonical bill-specific ProblemDetails identities.

#### Scenario: Bills endpoint responses reference canonical bill errors
- **WHEN** error responses for bill endpoints are reviewed
- **THEN** documented examples or references SHALL include `bill-category-type-mismatch`, `bill-due-day-invalid`, `bill-already-paid`, and `bill-inactive-for-month`.
