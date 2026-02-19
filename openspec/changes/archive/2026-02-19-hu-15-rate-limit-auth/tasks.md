## 1. OpenAPI and Contract Updates

- [x] 1.1 Add `429 Too Many Requests` response mappings to `POST /auth/login` and `POST /auth/refresh` in `backend/openapi.yaml`.
- [x] 1.2 Add canonical rate-limit ProblemDetails entry to `components/x-problem-details-catalog` with exact `type`, `title`, and `status`.
- [x] 1.3 Document `Retry-After` response header behavior for throttled auth responses.
- [x] 1.4 Mirror all contract updates into `openspec/specs/openapi.yaml` to prevent drift.

## 2. Rate Limiter Implementation

- [x] 2.1 Add rate-limit configuration settings for auth endpoints (baseline: login `10/min`, refresh `30/min`) and window parameters.
- [x] 2.2 Implement limiter abstraction with in-memory default backend suitable for dev/tests and Redis-ready extension path for production.
- [x] 2.3 Implement deterministic key strategy for auth throttling (username/IP for login, refresh identity strategy for refresh).
- [x] 2.4 Integrate limiter guard into `POST /auth/login` and `POST /auth/refresh` execution path before normal auth processing.
- [x] 2.5 Return canonical `429` ProblemDetails payload and include `Retry-After` when throttling is triggered.
- [x] 2.6 Ensure throttling detail messages are sanitized and do not leak internal limiter/storage implementation details.

## 3. Brute-force Hardening Behavior

- [x] 3.1 Implement optional temporary lock behavior controlled by configuration.
- [x] 3.2 Ensure lock expiration and bucket reset behavior is deterministic.
- [x] 3.3 Preserve unchanged auth success/error semantics when requests are under configured thresholds.

## 4. Tests

- [x] 4.1 Add integration test for login limit exceeded returning canonical `429` with `application/problem+json`.
- [x] 4.2 Add integration test for refresh limit exceeded returning canonical `429` with `application/problem+json`.
- [x] 4.3 Add integration tests asserting normal login/refresh behavior is unchanged under limits.
- [x] 4.4 Add tests validating `Retry-After` presence/format for throttled responses.
- [x] 4.5 Add deterministic tests for lock-window behavior (low thresholds or controlled timing) to avoid flakiness.
- [x] 4.6 Add/adjust contract tests to verify OpenAPI includes new `429` mappings and canonical catalog entry.

## 5. Verification

- [x] 5.1 Run full backend tests from `backend` with `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest`.
- [x] 5.2 Run coverage gate from `backend` with `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`.
- [x] 5.3 Confirm total `app` coverage remains `>= 90%`.
- [x] 5.4 Verify no regressions in existing auth lifecycle behavior (register/login/refresh/logout) outside throttled conditions.
