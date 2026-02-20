## Why

`POST /auth/register` still returns `refresh_token` in JSON while login/refresh already use cookie-based refresh transport and `AuthSessionResponse`. This inconsistency increases frontend branching and weakens the cookie-only security model introduced for enterprise web flows.

## What Changes

- Align `POST /auth/register` response contract with login/refresh:
  - return `AuthSessionResponse` (no `refresh_token` in JSON body)
  - issue `bb_refresh` cookie via `Set-Cookie`
- Remove `refresh_token` from register success examples and schema mapping in OpenAPI source and mirror.
- Update integration/contract tests to stop reading refresh token from register body and instead parse refresh cookie from response headers.

## Capabilities

### Modified Capabilities
- `api-http-contract`: register success contract now mirrors auth session endpoints (cookie transport + body without refresh token).
- `auth-session-management`: registration lifecycle emits refresh cookie and keeps refresh state server-side without exposing token in JSON.

## Impact

- Runtime: `backend/app/routers/auth.py` register handler response shape and cookie emission.
- Schemas: remove runtime dependency on `AuthResponse` for register path (keep/remodel schema based on compatibility decision).
- Contract: `backend/openapi.yaml` and `openspec/specs/openapi.yaml` update `/auth/register` response schema and examples.
- Tests: `backend/tests/test_api_integration.py`, `backend/tests/test_contract_openapi.py` update register-flow assumptions.

## Compatibility Notes

- This is a contract-breaking change for clients that currently read `refresh_token` from register response JSON.
- Web clients using cookie-based refresh become simpler and consistent across register/login/refresh.
