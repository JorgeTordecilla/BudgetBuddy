## ADDED Requirements

### Requirement: Audit endpoint contract is explicit in OpenAPI
The OpenAPI contract MUST document `GET /audit` with owner-scoped query parameters, deterministic pagination, and canonical media types.

#### Scenario: Audit list operation is documented
- **WHEN** `backend/openapi.yaml` is reviewed for `GET /audit`
- **THEN** it SHALL define `from`, `to`, `cursor`, and `limit` query parameters and a paginated response schema

#### Scenario: Audit success media type is vendor-specific
- **WHEN** `GET /audit` succeeds
- **THEN** the response SHALL use `application/vnd.budgetbuddy.v1+json`

### Requirement: Audit error mappings are canonical
Audit endpoint errors MUST be mapped to `application/problem+json` with canonical statuses.

#### Scenario: Audit endpoint documents authz and negotiation errors
- **WHEN** `GET /audit` contract responses are reviewed
- **THEN** it SHALL include canonical `401`, `403`, and `406` mappings using `ProblemDetails`

#### Scenario: Audit endpoint documents validation errors
- **WHEN** `GET /audit` contract responses are reviewed
- **THEN** it SHALL include canonical `400` mappings for invalid cursor and invalid date range

### Requirement: Audit schemas are reusable OpenAPI components
The OpenAPI contract MUST define reusable schemas for audit items and list responses.

#### Scenario: Audit schemas are referenced by endpoint
- **WHEN** components and `/audit` operation are reviewed
- **THEN** schemas for audit event item and paginated list SHALL be defined and referenced by `GET /audit`
