## ADDED Requirements

### Requirement: Budget endpoints preserve API media-type contract
Budget endpoints MUST follow the established HTTP media-type policy for success and error payloads.

#### Scenario: Budget success payloads use vendor media type
- **WHEN** `GET /budgets`, `POST /budgets`, `GET /budgets/{budget_id}`, or `PATCH /budgets/{budget_id}` succeeds with a response body
- **THEN** the API SHALL return `Content-Type: application/vnd.budgetbuddy.v1+json`

#### Scenario: Budget archive returns empty 204 response
- **WHEN** `DELETE /budgets/{budget_id}` succeeds
- **THEN** the API SHALL return `204` with no response body

#### Scenario: Budget errors use ProblemDetails media type
- **WHEN** a budget endpoint returns validation, authz, negotiation, or business-rule errors
- **THEN** the API SHALL return `Content-Type: application/problem+json` with required `ProblemDetails` fields

### Requirement: Budget endpoint response mapping is explicit in OpenAPI
The OpenAPI contract MUST explicitly define response mappings for budget endpoints, including canonical `401`, `403`, `406`, and budget-specific `409` conflicts.

#### Scenario: Budget list and create responses are documented
- **WHEN** `backend/openapi.yaml` is reviewed for `/budgets`
- **THEN** `GET /budgets` and `POST /budgets` SHALL define success and `application/problem+json` error response mappings

#### Scenario: Budget item responses are documented
- **WHEN** `backend/openapi.yaml` is reviewed for `/budgets/{budget_id}`
- **THEN** `GET`, `PATCH`, and `DELETE` SHALL define success and `application/problem+json` error response mappings

#### Scenario: Budget conflict responses are canonical
- **WHEN** OpenAPI defines `409` responses for budget writes
- **THEN** the documented `ProblemDetails` values SHALL include canonical conflict types for duplicate budget key, category archived, and category ownership conflict

### Requirement: Budget resource schemas are explicit in OpenAPI components
The OpenAPI contract MUST define reusable budget schemas for request/response payloads used by budget endpoints.

#### Scenario: Budget schemas exist and are referenced by endpoints
- **WHEN** OpenAPI components and budget path operations are reviewed
- **THEN** schemas `Budget`, `BudgetCreate`, `BudgetUpdate`, and `BudgetListResponse` SHALL exist and SHALL be referenced by corresponding budget operations
