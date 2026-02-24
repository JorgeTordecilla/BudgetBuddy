## Why

Neon free tier can scale to zero after idle periods, leaving stale SQLAlchemy pooled connections that fail on first use. This currently leaks as `500` on `POST /auth/refresh`, degrading auth reliability.

## What Changes

- Harden SQLAlchemy engine connectivity for Postgres/Neon with connection liveness checks and recycle policy.
- Add runtime configuration for DB pool liveness behavior with safe defaults.
- Add bounded retry handling for transient DB connectivity failures in refresh flow.
- Ensure transient DB connectivity failures in auth refresh never leak raw stack traces and return canonical `503` ProblemDetails when retry cannot recover.
- Document `503` contract behavior for refresh transient DB outages.

## Capabilities

### New Capabilities
- `database-connection-resilience`: runtime database connection liveness and transient failure recovery guarantees.

### Modified Capabilities
- `auth-session-management`: refresh flow behavior under transient DB connectivity failures.
- `runtime-configuration`: configuration surface for DB pool pre-ping and recycle settings.
- `api-http-contract`: refresh endpoint response contract includes transient `503` operational failure behavior.
- `problem-details-catalog`: canonical `503` service-unavailable error identity for transient DB outages.

## Impact

- Affected code: `backend/app/db/session.py`, `backend/app/core/config.py`, `backend/app/routers/auth.py`, `backend/app/errors.py`, `backend/app/openapi.yaml`.
- Affected tests: backend integration and unit tests for refresh flow and DB connectivity failure handling.
- Backwards compatibility: successful and auth-validation refresh semantics stay unchanged; only transient DB outages now produce deterministic non-500 behavior.

