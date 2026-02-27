## Why

The frontend already has basic auth retry and route protection, but session behavior is still inconsistent across hydration, refresh failure conditions, and cache/logout boundaries. We need a single, deterministic session lifecycle so users stay signed in seamlessly while refresh is valid and are redirected only when refresh is explicitly invalidated.

## What Changes

- Define frontend session lifecycle requirements for startup hydration, 401 handling, and protected/public route behavior.
- Standardize refresh concurrency handling with a single in-flight refresh lock and one retry per failed request.
- Clarify logout semantics, including local session clearing and query cache reset to avoid stale cross-user data.
- Formalize network-vs-auth refresh failure policy to avoid unnecessary forced logout on transient connectivity errors.
- Add explicit frontend quality gates for session behavior tests and coverage thresholds.

## Capabilities

### New Capabilities
- `frontend-session-lifecycle`: Frontend-only requirements for auth session hydration, guarded routing, refresh retry policy, and logout/cache consistency.

### Modified Capabilities
- `frontend-error-ux`: Extend global error UX expectations to include session-expired and refresh-failure rendering paths with request-id continuity.

## Impact

- Affected code:
  - `frontend/src/auth/AuthContext.tsx`
  - `frontend/src/api/client.ts`
  - `frontend/src/routes/RequireAuth.tsx`
  - `frontend/src/routes/Login.tsx`
  - `frontend/src/main.tsx`
  - `frontend/src/query/queryClient.ts`
  - new/updated tests under `frontend/src/auth`, `frontend/src/api`, and route-level suites.
- Affected API contract usage:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /me`
- Media-type impact:
  - Preserve success handling with `application/vnd.budgetbuddy.v1+json`
  - Preserve error handling with `application/problem+json`
- Backwards compatibility:
  - No API-breaking changes; this is frontend behavioral hardening and UX consistency.
