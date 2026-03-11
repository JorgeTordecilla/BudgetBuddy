## Context

The backend already enforces deterministic throttling for `POST /auth/login` and `POST /auth/refresh`, but current auth limiter behavior still has two concrete gaps:

- refresh limiter identity includes token hash, allowing attackers to bypass throttling by varying arbitrary token values;
- register currently has no throttling, allowing unbounded account creation attempts from a single client IP.

Separately, the in-memory limiter never evicts expired buckets, which can cause unbounded growth in long-lived processes under distributed abuse patterns.

This change hardens abuse resistance while preserving existing auth success semantics, canonical ProblemDetails behavior, and the current in-memory limiter architecture.

Constraints:
- Keep auth success payloads unchanged.
- Preserve canonical `429` + `Retry-After` behavior.
- Apply throttling before expensive database work where possible.
- Keep implementation compatible with the current in-memory limiter and test strategy.

## Goals / Non-Goals

**Goals:**
- Make refresh throttling non-bypassable by arbitrary token variation.
- Add endpoint-specific throttling to `POST /auth/register`.
- Keep throttling deterministic and testable.
- Bound limiter memory growth through passive cleanup.
- Keep OpenAPI and OpenSpec aligned with runtime behavior.

**Non-Goals:**
- No Redis/distributed rate limiting in this change.
- No user-id-based refresh throttling after token lookup.
- No auth session payload or cookie redesign.
- No frontend behavior changes beyond consuming existing canonical `429`.

## Decisions

### D1. Refresh throttling identity uses client IP only
`POST /auth/refresh` will derive limiter identity from trusted client IP resolution only.

Rationale:
- closes the current bypass where arbitrary token values create separate buckets;
- keeps throttling before token lookup and database work;
- matches the low-cost abuse-resistance posture already used for transaction import/export throttling.

Tradeoff:
- multiple users behind one NAT/shared IP will share the same refresh bucket.

Rejected alternative:
- `user_id + ip` after token validation.
  - Rejected because it moves throttling after database work and weakens protection against invalid-token floods.

### D2. Register gets its own endpoint-specific limit
Add `AUTH_REGISTER_RATE_LIMIT_PER_MINUTE` with default `5` and support `endpoint="register"` inside auth throttling.

Rationale:
- register abuse profile differs from login/refresh;
- endpoint-specific tuning is already the pattern used by auth throttling.

### D3. Register throttling remains IP-based
`POST /auth/register` throttles on client IP only.

Rationale:
- registration has no trusted authenticated identity yet;
- IP-only is the simplest pre-database control.

### D4. Limiter cleanup uses periodic passive sweep
`InMemoryRateLimiter` will maintain an operation counter and periodically perform a locked sweep removing expired inactive buckets.

Initial direction:
- sweep every `1000` `check()` calls;
- remove buckets whose window has expired and whose `lock_until` is unset or already expired.

Rationale:
- no public API change;
- low complexity under the existing lock;
- enough to bound memory growth without introducing background workers.

Rejected alternative:
- background cleanup thread.
  - Rejected as unnecessary operational complexity for the current architecture.

### D5. Register throttling is a contract change and must be documented
`POST /auth/register` must explicitly document canonical `429` ProblemDetails and `Retry-After` in OpenAPI and mirrored specs.

Rationale:
- runtime and contract must remain aligned;
- clients need consistent throttling semantics across auth endpoints.

## Error Taxonomy

This change does not introduce a new error type.

Affected canonical behavior:
- `429 Too Many Requests`
- `application/problem+json`
- `Retry-After` header on throttled requests

Affected endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

## Verification Strategy

- Integration tests for register throttling over threshold.
- Integration tests proving refresh throttling cannot be bypassed by rotating invalid token strings from the same IP.
- Regression tests proving login/register/refresh behavior remains unchanged under threshold.
- Unit tests for limiter cleanup behavior and bucket eviction conditions.
- Full backend suite from `backend/.venv`.

## Open Questions

- Should register inherit auth lock-window behavior when lock mode is enabled, or only threshold/window throttling?
- Should the mirrored `openspec/specs/openapi.yaml` be updated inside this change or only during sync?
