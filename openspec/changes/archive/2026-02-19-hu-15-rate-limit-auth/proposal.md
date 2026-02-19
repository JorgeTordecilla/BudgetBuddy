## Why

Authentication endpoints are primary attack targets for credential stuffing and token abuse. We need deterministic rate limiting now to reduce brute-force risk while keeping existing auth flows and API contract behavior stable for legitimate clients.

## What Changes

- Add rate limiting controls for `POST /auth/login` and `POST /auth/refresh`.
- Add canonical `429 Too Many Requests` ProblemDetails responses for rate-limited auth requests.
- Add configurable per-endpoint limits (initial baseline: login `10/min`, refresh `30/min`).
- Add optional short lock window behavior by username and/or client IP to harden brute-force resistance.
- Add `Retry-After` response header on throttled requests to provide deterministic retry guidance.
- Keep existing success media type (`application/vnd.budgetbuddy.v1+json`) and error media type (`application/problem+json`) policies unchanged.

## Capabilities

### New Capabilities
- `auth-rate-limiting`: Defines auth throttling behavior, lock/throttle semantics, and deterministic retry signaling for login/refresh endpoints.

### Modified Capabilities
- `api-http-contract`: Extend auth endpoint response mappings to include canonical `429` and `Retry-After` behavior where applicable.
- `auth-session-management`: Add auth flow requirements ensuring login/refresh behavior remains unchanged under configured thresholds and deterministic under limit exceedance.
- `problem-details-catalog`: Add canonical ProblemDetails entry for `rate-limited` with exact `type`, `title`, and `status`.

## Impact

- OpenAPI updates in `backend/openapi.yaml` and mirrored contract updates in `openspec/specs/openapi.yaml`.
- Impacted paths:
  - `POST /auth/login`
  - `POST /auth/refresh`
- Impacted components:
  - `components/x-problem-details-catalog` (new canonical `429` entry)
  - response mappings for auth endpoints (`429`, `application/problem+json`)
- Backend impact in middleware/dependencies/router flow around auth request handling and request identity keys (username/IP/token context).
- Test impact:
  - Integration tests for limit exceeded => canonical `429` ProblemDetails.
  - Regression tests proving auth behavior is unchanged under thresholds.
  - Deterministic timing strategy in tests (controlled windows/low thresholds).
- Backwards compatibility:
  - Additive contract change only; no schema-breaking changes to existing success payloads.
- Media-type impact:
  - No change to baseline policy; throttled responses remain `application/problem+json`.
