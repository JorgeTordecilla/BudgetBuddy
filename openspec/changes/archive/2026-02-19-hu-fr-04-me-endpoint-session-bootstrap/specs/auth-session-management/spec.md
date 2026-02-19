## ADDED Requirements

### Requirement: Session introspection endpoint for authenticated web bootstrap
Auth session management MUST include a dedicated authenticated `GET /me` endpoint that allows web clients to bootstrap user session state independently of login/refresh timing.

#### Scenario: Bootstrap after app load with valid access token
- **WHEN** a web client calls `GET /me` after startup with a valid access token
- **THEN** the API SHALL return current authenticated user identity data without requiring login or refresh request flow coupling

#### Scenario: Bootstrap fails deterministically without valid access token
- **WHEN** a web client calls `GET /me` without valid access token context
- **THEN** the API SHALL return canonical `401` ProblemDetails and SHALL NOT return partial user data

### Requirement: Session introspection is additive and non-breaking
Adding `GET /me` MUST NOT change existing auth session endpoint semantics.

#### Scenario: Existing auth flows remain unchanged
- **WHEN** register/login/refresh/logout flows execute after introducing `GET /me`
- **THEN** statuses, payload shapes, and cookie/session behaviors for those endpoints SHALL remain unchanged
