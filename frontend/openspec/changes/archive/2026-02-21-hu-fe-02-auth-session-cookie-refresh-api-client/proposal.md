## Why

HU-FE-01 established layout and routing, but users still cannot authenticate or keep a usable browser session.  
The frontend now needs a secure session model aligned with backend cookie-refresh + bearer access token behavior.

## What Changes

- Implement real login flow against `POST /auth/login` from the frontend login page.
- Add in-memory auth session state for `access_token` and authenticated user.
- Implement API client wrapper with:
  - canonical media-type headers
  - `credentials: "include"`
  - optional `X-Request-Id`
  - single refresh-on-401 retry behavior.
- Implement refresh flow using `POST /auth/refresh` with cookie-based session.
- Implement logout flow with `POST /auth/logout` and client-state reset.
- Upgrade route guard behavior:
  - attempt token recovery via refresh when token missing/expired
  - redirect to `/login` when refresh fails.
- Add minimal verification coverage (unit tests or documented manual verification).

## Capabilities

### New Capabilities
- `frontend-auth-session-management`: Frontend login/session lifecycle with in-memory access token, HttpOnly refresh-cookie flow, resilient API client retry/refresh logic, and protected route bootstrap behavior.

### Modified Capabilities
- `frontend-routing-ui-foundation`: Upgrade private-route guard behavior from placeholder blocking to real session-aware routing with refresh bootstrap.

## Impact

- Affected code:
  - `src/auth/*`, `src/api/*`, `src/routes/RequireAuth.tsx`, `src/routes/Login.tsx`, routing/provider wiring.
- APIs used:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /me`
- Security/runtime behavior:
  - no token storage in local/session storage
  - access token memory-only
  - refresh cookie managed by browser with credentials mode.
