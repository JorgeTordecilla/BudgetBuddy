## ADDED Requirements

### Requirement: Auth endpoints document request correlation header
The HTTP contract MUST explicitly document `X-Request-Id` response header behavior for core auth session endpoints.

#### Scenario: Login response mappings include request-id header
- **WHEN** `POST /auth/login` response mappings are reviewed
- **THEN** documented success and error responses SHALL include `X-Request-Id` header reference

#### Scenario: Refresh response mappings include request-id header
- **WHEN** `POST /auth/refresh` response mappings are reviewed
- **THEN** documented success and error responses SHALL include `X-Request-Id` header reference

#### Scenario: Logout response mappings include request-id header
- **WHEN** `POST /auth/logout` response mappings are reviewed
- **THEN** documented `204` and error responses SHALL include `X-Request-Id` header reference

### Requirement: Auth request-id contract reflects runtime behavior
Documented request-id behavior for auth endpoints MUST match middleware-emitted runtime headers.

#### Scenario: Runtime auth responses include request-id
- **WHEN** clients call login/refresh/logout endpoints
- **THEN** responses SHALL include non-empty `X-Request-Id` header
