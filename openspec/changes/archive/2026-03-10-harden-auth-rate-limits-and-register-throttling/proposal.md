## Why

Authentication endpoints are the backend's primary abuse surface, and current auth throttling still has two concrete gaps: `POST /auth/refresh` can be rate-limit bypassed by rotating arbitrary token values, and `POST /auth/register` has no throttling at all. At the same time, the in-memory limiter never evicts expired buckets, which can cause unbounded memory growth under long-lived or distributed abuse traffic.

## What Changes

- Change refresh throttling identity from `token_hash + ip` to client IP only so arbitrary refresh token variation cannot create independent limiter buckets.
- Add register endpoint throttling with a dedicated configuration value `AUTH_REGISTER_RATE_LIMIT_PER_MINUTE` defaulting to `5`.
- Extend auth limiter runtime to support `register` as a first-class throttled endpoint before database work executes.
- Document `429 Too Many Requests` and `Retry-After` behavior for `POST /auth/register` in `backend/openapi.yaml`.
- Mirror the contract change into `openspec/specs/openapi.yaml` and related auth specs.
- Add passive cleanup to `InMemoryRateLimiter` so expired inactive buckets do not accumulate indefinitely in memory.
- Preserve auth success payloads, media types, and under-threshold behavior for legitimate clients.

## Capabilities

### New Capabilities
- `in-memory-rate-limiter-hygiene`: Defines bounded-memory behavior for passive eviction of expired limiter buckets in long-lived backend processes.

### Modified Capabilities
- `auth-rate-limiting`: Extend auth throttling requirements to cover register, refresh IP-only identity, and deterministic limiter cleanup behavior.
- `auth-session-management`: Extend auth session flow requirements so `POST /auth/register` documents throttled behavior without changing normal success semantics.
- `api-http-contract`: Extend auth endpoint response mappings so `POST /auth/register` documents canonical `429` ProblemDetails and `Retry-After`.
- `runtime-configuration`: Extend runtime configuration requirements to include register throttling configuration.

## Impact

- Runtime code:
  - `backend/app/routers/auth.py`
  - `backend/app/core/rate_limit.py`
  - `backend/app/core/config.py`
  - `backend/.env.example`
- Contract and spec artifacts:
  - `backend/openapi.yaml`
  - `openspec/specs/openapi.yaml`
  - auth-related OpenSpec capability specs
- Affected API paths:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
- Affected response contract:
  - additive `429` + `Retry-After` documentation for register
  - no success-schema or media-type changes
