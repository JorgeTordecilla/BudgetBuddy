## 1. Logging contract

- [x] 1.1 Add/standardize per-request structured access log fields (`request_id`, `method`, `path`, `status_code`, `duration_ms`, `user_id`).
- [x] 1.2 Ensure request log format is machine-parseable and consistent with existing logging style.

## 2. Runtime wiring

- [x] 2.1 Add middleware-based access logging for all API requests.
- [x] 2.2 Populate `user_id` in request context when authentication succeeds.
- [x] 2.3 Add configurable log level through environment setting(s).
- [x] 2.4 Enforce environment-based 5xx stacktrace policy (verbose in non-prod, restricted in prod).

## 3. Safety and data minimization

- [x] 3.1 Ensure no additional PII is logged in request/access records.
- [x] 3.2 Ensure error logs do not leak secrets in production.

## 4. Tests

- [x] 4.1 Add/extend tests asserting request logs always include `request_id`.
- [x] 4.2 Add/extend tests for required access-log fields.
- [x] 4.3 Add/extend tests for stacktrace behavior by environment mode.

## 5. Verification

- [x] 5.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 5.2 Validate OpenSpec change artifacts.
