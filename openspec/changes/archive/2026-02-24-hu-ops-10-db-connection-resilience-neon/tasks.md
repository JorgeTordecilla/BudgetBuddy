## 1. Engine resilience

- [x] 1.1 Add runtime settings for `DB_POOL_PRE_PING` and `DB_POOL_RECYCLE_SECONDS` with validation.
- [x] 1.2 Apply `pool_pre_ping` and `pool_recycle` in SQLAlchemy engine creation for non-SQLite engines.
- [x] 1.3 Keep SQLite behavior unchanged for local tests.

## 2. Refresh transient failure handling

- [x] 2.1 Add canonical `service-unavailable` ProblemDetails helper (`503`).
- [x] 2.2 In `POST /auth/refresh`, add bounded retry (single retry) around transient DB read failures (`OperationalError`).
- [x] 2.3 On repeated transient DB failure, return canonical `503` ProblemDetails with sanitized detail.

## 3. Contract alignment

- [x] 3.1 Update `backend/openapi.yaml` for `POST /auth/refresh` to include `503` ProblemDetails response.
- [x] 3.2 Add/align canonical `503` example in ProblemDetails catalog references.

## 4. Tests

- [x] 4.1 Add unit tests for engine builder options (SQLite vs Postgres resilience options).
- [x] 4.2 Add integration test: first refresh DB failure retries once and can succeed.
- [x] 4.3 Add integration test: repeated refresh DB failure returns canonical `503` ProblemDetails.

## 5. Verification

- [x] 5.1 Run backend test suite with coverage and keep target >= 90%.
- [x] 5.2 Run `openspec validate hu-ops-10-db-connection-resilience-neon`.
