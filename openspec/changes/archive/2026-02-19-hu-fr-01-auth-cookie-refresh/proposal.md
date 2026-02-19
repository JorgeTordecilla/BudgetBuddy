## Why

The current auth contract returns `refresh_token` in JSON bodies, which is unsuitable for enterprise web clients because refresh tokens can be exposed to XSS. Moving refresh handling to an `HttpOnly` cookie hardens token security and enables automatic browser-driven refresh flows with `Authorization: Bearer` access tokens.

## What Changes

- Migrate refresh-token transport from JSON body to `HttpOnly` cookie (`bb_refresh`) for login, refresh, and logout flows.
- Update `POST /auth/login` and `POST /auth/refresh` response shapes to exclude `refresh_token` from JSON and return cookie rotation via `Set-Cookie`.
- Update `POST /auth/refresh` request contract to use cookie-based refresh (no request body required).
- Update `POST /auth/logout` behavior to expire the refresh cookie deterministically.
- Standardize cookie attributes (`HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, `Max-Age=<refresh_ttl_seconds>`).
- Update OpenAPI examples and response headers to document `Set-Cookie` and canonical error semantics.
- Regenerate SDKs after OpenAPI updates to prevent drift.
- **BREAKING**: `refresh_token` is removed from login/refresh success JSON payloads in v1 contract.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: update auth endpoint request/response and header contract for cookie-based refresh transport.
- `auth-session-management`: change refresh lifecycle semantics to cookie transport, rotation, and logout expiry behavior.
- `problem-details-catalog`: align canonical 401/403 auth failure mappings for missing/invalid/expired/reused cookie-based refresh tokens.
- `sdk-generation`: update generated clients and regeneration expectations for modified auth OpenAPI shapes.

## Impact

- OpenAPI: `backend/openapi.yaml`, `openspec/specs/openapi.yaml`.
- Backend runtime: `backend/app/routers/auth.py`, auth security helpers, and auth-related settings.
- SDK artifacts: `sdk/python/*`, `sdk/typescript/*` regenerated from OpenAPI.
- Integration and contract tests for login/refresh/logout cookie semantics and canonical ProblemDetails.
- Browser/CORS compatibility: cookie credential usage must remain compatible with enterprise cross-site deployment constraints.
