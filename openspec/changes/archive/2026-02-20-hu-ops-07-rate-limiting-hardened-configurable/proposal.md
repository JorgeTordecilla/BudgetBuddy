## Why

Current rate limiting covers only part of the attack and abuse surface.
Operators need configurable limits for auth and heavy transaction endpoints to protect availability without breaking legitimate clients.

## What Changes

- Extend configurable rate limiting to:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /transactions/import`
  - `GET /transactions/export`
- Ensure all throttled responses are canonical:
  - `429` + `application/problem+json`
  - `Retry-After` header
- Emit structured `rate_limited` operational log events for blocked requests.

## Impact

- Better abuse resistance for high-cost and auth-critical endpoints.
- More predictable client retry behavior through explicit `Retry-After`.
- Improved operational visibility for throttling behavior and tuning.
