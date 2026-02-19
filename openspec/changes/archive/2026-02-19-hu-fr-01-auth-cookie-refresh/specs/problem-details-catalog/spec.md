## ADDED Requirements

### Requirement: Cookie-based refresh failures are canonically mapped
ProblemDetails catalog MUST explicitly cover cookie-transport auth failures without leaking token internals.

#### Scenario: Missing or invalid refresh cookie maps to canonical unauthorized
- **WHEN** `POST /auth/refresh` is called without `bb_refresh` cookie or with malformed/expired cookie value
- **THEN** response SHALL use canonical `401` ProblemDetails (`type=https://api.budgetbuddy.dev/problems/unauthorized`, `title=Unauthorized`, `status=401`)

#### Scenario: Revoked or reused refresh cookie maps to canonical forbidden
- **WHEN** refresh token represented by `bb_refresh` is revoked or reuse-detected
- **THEN** response SHALL use canonical `403` ProblemDetails entries (`refresh-revoked` or `refresh-reuse-detected`)

### Requirement: Auth cookie error details remain sanitized
Client-visible ProblemDetails for cookie-based auth failures MUST avoid exposing token parsing internals.

#### Scenario: Refresh cookie errors do not expose token internals
- **WHEN** cookie-based refresh fails
- **THEN** `detail` SHALL NOT include raw token contents, signature diagnostics, stack traces, or persistence internals
