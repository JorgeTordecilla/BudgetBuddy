## Summary

Add DB connection resilience for Neon scale-to-zero by validating pooled connections before use, recycling old connections, and handling transient DB failures in `/auth/refresh` with bounded retry and canonical failure semantics.

## Runtime Behavior

1. Engine hardening
- Enable `pool_pre_ping=True` for non-SQLite engines.
- Add `pool_recycle` with configurable TTL for non-SQLite engines.

2. Refresh transient DB failure handling
- Wrap the refresh repository lookup path with one bounded retry for `OperationalError`.
- On first `OperationalError`, rollback session state and retry refresh DB read once.
- If second attempt fails, return canonical `503` ProblemDetails (`service-unavailable`) without stacktrace leakage.

3. Contract behavior
- `POST /auth/refresh` keeps existing outcomes for:
  - success (`200`)
  - invalid/expired (`401`)
  - revoked/reuse/origin policy (`403`)
  - throttled (`429`)
- Adds deterministic transient operational failure outcome:
  - `503` with canonical ProblemDetails identity.

## Configuration

Add runtime settings:
- `DB_POOL_PRE_PING` (default: `true`)
- `DB_POOL_RECYCLE_SECONDS` (default: `240`, minimum `1`)

Behavior:
- Applied only for non-SQLite URLs.
- SQLite test behavior remains unchanged.

## Observability and Security

- Log transient refresh DB errors with request context and retry stage.
- Do not leak DB driver internals, SQL text, or stack traces in client-visible `detail`.

## Risks / Trade-offs

- Retry adds minor latency on failing requests, but removes first-request flakiness after Neon wake-up.
- Returning `503` introduces a new documented error path; clients should treat as retriable operational error.

## Verification Plan

- Unit test engine builder options for SQLite vs Postgres.
- Integration test refresh flow when first DB read raises `OperationalError` and second succeeds.
- Integration test refresh flow when DB read fails twice returns canonical `503` ProblemDetails.
- Run full backend tests with coverage gate.

