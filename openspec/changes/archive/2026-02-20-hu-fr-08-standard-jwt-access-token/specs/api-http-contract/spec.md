## ADDED Requirements

### Requirement: Bearer access token format is standards-aligned
The API contract MUST describe bearer access tokens as JWT-compatible while keeping the existing authorization transport unchanged.

#### Scenario: Authorization transport remains unchanged
- **WHEN** authenticated endpoints are called
- **THEN** clients SHALL continue sending `Authorization: Bearer <access_token>`

#### Scenario: Contract clarifies JWT interoperability expectations
- **WHEN** auth endpoint docs are reviewed
- **THEN** they SHALL state that access tokens are signed JWTs and that invalid/expired tokens return canonical `401` ProblemDetails
