## MODIFIED Requirements

### Requirement: ProblemDetails for error payloads
The backend MUST return all error payloads as `application/problem+json` and include required `ProblemDetails` fields: `type`, `title`, and `status`.

#### Scenario: Ownership denial is canonical forbidden
- **WHEN** an authenticated user accesses a domain resource owned by another user
- **THEN** the API SHALL return `403` with `application/problem+json` and canonical forbidden fields

### Requirement: Ownership policy for domain resource endpoints
All scoped domain resource ownership checks MUST use a single cross-user policy.

#### Scenario: Accounts ownership policy is deterministic
- **WHEN** `GET/PATCH/DELETE /accounts/{account_id}` targets a non-owned resource
- **THEN** the API SHALL return `403` (not `404`) as ProblemDetails

#### Scenario: Categories ownership policy is deterministic
- **WHEN** `GET/PATCH/DELETE /categories/{category_id}` targets a non-owned resource
- **THEN** the API SHALL return `403` (not `404`) as ProblemDetails

#### Scenario: Transactions ownership policy is deterministic
- **WHEN** `GET/PATCH/DELETE /transactions/{transaction_id}` targets a non-owned resource
- **THEN** the API SHALL return `403` (not `404`) as ProblemDetails

### Requirement: OpenAPI ownership mapping consistency
OpenAPI MUST document the chosen ownership policy consistently for scoped endpoints.

#### Scenario: Scoped endpoints include 403 ownership responses
- **WHEN** contract files are reviewed for all scoped GET/PATCH/DELETE resource endpoints
- **THEN** each endpoint SHALL include `403` response mapping with `application/problem+json` for non-owned access
