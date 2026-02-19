## Why

Web clients need a simple, deterministic way to bootstrap session state after page load or token refresh. A dedicated authenticated `GET /me` endpoint reduces frontend complexity and avoids coupling session bootstrap to login/refresh response timing.

## What Changes

- Add `GET /me` to return the authenticated user profile as `User`.
- Define contract responses for `GET /me`:
  - `200` with `application/vnd.budgetbuddy.v1+json` and `User` payload
  - `401` with canonical `application/problem+json`
  - `406` with canonical `application/problem+json`
  - `X-Request-Id` response header on contract responses
- Reuse existing `User` schema and canonical ProblemDetails identities (no new error types).
- Add integration tests for:
  - successful authenticated `GET /me`
  - unauthenticated `GET /me` returning canonical `401`

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: extend the HTTP contract with `GET /me` and explicit response/header behavior for session bootstrap.
- `auth-session-management`: include `GET /me` as an authenticated session introspection endpoint for web bootstrap ergonomics.

## Impact

- OpenAPI contract files:
  - `backend/openapi.yaml`
  - `openspec/specs/openapi.yaml`
- Backend runtime:
  - `backend/app/routers/auth.py` (or a user/session router, depending on project structure)
- Tests:
  - integration tests covering `GET /me` success and unauthorized behavior
- Backward compatibility:
  - non-breaking additive endpoint; existing auth/login/refresh/logout contracts remain unchanged
- Media types:
  - unchanged (`application/vnd.budgetbuddy.v1+json` for success, `application/problem+json` for errors)
