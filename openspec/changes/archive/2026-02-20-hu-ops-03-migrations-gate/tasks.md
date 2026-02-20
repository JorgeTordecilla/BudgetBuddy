## 1. Contract

- [x] 1.1 Update readiness contract to document migration-gate behavior with strict/non-strict modes.
- [x] 1.2 Define readiness response examples for schema match/mismatch outcomes.
- [x] 1.3 Keep `X-Request-Id` behavior explicit in readiness responses.

## 2. Runtime behavior

- [x] 2.1 Add migration revision check utility (current vs head) using Alembic-compatible programmatic access.
- [x] 2.2 Add `MIGRATIONS_STRICT` configuration and environment-safe defaults.
- [x] 2.3 Update `GET /readyz` logic to fail with `503` on schema mismatch when strict mode is enabled.
- [x] 2.4 Add explicit logs for `db_revision`, `head_revision`, and `migrations_strict`.

## 3. Tests

- [x] 3.1 Add integration tests: strict mode + revision mismatch -> `503`.
- [x] 3.2 Add integration tests: strict mode + revision match -> `200`.
- [x] 3.3 Add integration tests: non-strict mode + mismatch -> readiness remains DB-driven.
- [x] 3.4 Add tests for revision-check failure handling (missing alembic metadata / query errors).

## 4. Documentation

- [x] 4.1 Update deployment docs with `alembic upgrade head` as required deployment step.
- [x] 4.2 Add mismatch diagnosis steps (`alembic current`, `alembic heads`) and expected outcomes.

## 5. Verification

- [x] 5.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 5.2 Validate OpenSpec change artifacts.
