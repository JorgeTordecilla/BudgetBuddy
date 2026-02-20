## ADDED Requirements

### Requirement: Access bearer tokens use standard JWT format
Access tokens issued by auth session endpoints MUST be RFC 7519-compatible JWTs.

#### Scenario: Auth endpoints emit JWT access tokens
- **WHEN** `POST /auth/register`, `POST /auth/login`, or `POST /auth/refresh` succeeds
- **THEN** `access_token` SHALL be a signed JWT in `header.payload.signature` format

#### Scenario: JWT claims are minimally enforced
- **WHEN** bearer access tokens are validated
- **THEN** validation SHALL require at least `sub`, `exp`, and `iat` claims and reject missing/invalid claims with canonical `401`

### Requirement: Legacy non-JWT access tokens are rejected
Access-token validation MUST reject legacy non-JWT bearer tokens.

#### Scenario: Legacy token format is rejected
- **WHEN** a bearer token is not in JWT `header.payload.signature` format
- **THEN** protected endpoints SHALL reject it with canonical `401`
