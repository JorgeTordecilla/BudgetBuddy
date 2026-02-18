## MODIFIED Requirements

### Requirement: Ownership and access control across domain resources
The backend MUST enforce authenticated user ownership for accounts, categories, and transactions.

#### Scenario: Unauthenticated resource access
- **WHEN** a protected domain endpoint is called without valid access token
- **THEN** the API SHALL return canonical `401` ProblemDetails

#### Scenario: Resource exists but is not accessible
- **WHEN** a valid user token references a resource not owned by that user
- **THEN** the API SHALL return canonical `403` ProblemDetails

#### Scenario: Restore category matrix asserts canonical authz errors
- **WHEN** restore category tests exercise unauthenticated and cross-user paths
- **THEN** the API SHALL return exact canonical `type`, `title`, and `status` for `401` and `403`
