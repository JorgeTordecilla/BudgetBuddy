## MODIFIED Requirements

### Requirement: Vendor media type for successful payloads
The backend MUST return response bodies for successful non-204 operations using `application/vnd.budgetbuddy.v1+json`.

#### Scenario: Transaction restore success uses vendor media type
- **WHEN** `PATCH /transactions/{transaction_id}` sets `archived_at` to `null` for an owned transaction
- **THEN** the API SHALL return `200` with `Content-Type: application/vnd.budgetbuddy.v1+json` and `Transaction` payload

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Transaction restore without token is unauthorized
- **WHEN** `PATCH /transactions/{transaction_id}` with `archived_at=null` is called without valid bearer token
- **THEN** the API SHALL return canonical `401` ProblemDetails

#### Scenario: Transaction restore for non-owner is forbidden
- **WHEN** `PATCH /transactions/{transaction_id}` with `archived_at=null` targets another user's transaction
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Transaction restore with unsupported accept is not acceptable
- **WHEN** `PATCH /transactions/{transaction_id}` with `archived_at=null` is called with unsupported `Accept`
- **THEN** the API SHALL return canonical `406` ProblemDetails

### Requirement: Transaction restore idempotency
Transaction restore through patch MUST be idempotent.

#### Scenario: Restore archived transaction
- **WHEN** transaction is archived and client sends `PATCH /transactions/{transaction_id}` with `archived_at=null`
- **THEN** `archived_at` SHALL become `null` and response SHALL be `200`

#### Scenario: Restore already-active transaction
- **WHEN** transaction already has `archived_at=null` and client sends same restore patch
- **THEN** API SHALL return `200` with unchanged active state
