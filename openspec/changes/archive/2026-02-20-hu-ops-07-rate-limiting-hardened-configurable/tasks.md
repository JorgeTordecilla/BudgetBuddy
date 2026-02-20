## 1. Contract updates

- [x] 1.1 Update OpenAPI to include canonical `429` responses for `POST /transactions/import` and `GET /transactions/export`.
- [x] 1.2 Ensure `429` responses document `Retry-After` header and `application/problem+json`.

## 2. Runtime configuration

- [x] 2.1 Add env-configurable limits for import/export endpoints.
- [x] 2.2 Validate rate-limit settings at startup with fail-fast behavior for invalid values.
- [x] 2.3 Keep existing auth rate-limit configuration behavior intact.

## 3. Runtime enforcement

- [x] 3.1 Enforce rate limits on `POST /transactions/import` and `GET /transactions/export`.
- [x] 3.2 Ensure throttled responses use canonical `429` ProblemDetails + `Retry-After`.
- [x] 3.3 Ensure non-throttled behavior remains unchanged.

## 4. Observability

- [x] 4.1 Emit structured `rate_limited` log events for all throttled endpoints.
- [x] 4.2 Ensure logged limiter metadata is operationally useful and secret-safe.

## 5. Tests

- [x] 5.1 Add integration tests for `429` + `Retry-After` on auth/login and auth/refresh.
- [x] 5.2 Add integration tests for `429` + `Retry-After` on transactions/import and transactions/export.
- [x] 5.3 Add under-limit regression tests to confirm normal behavior is preserved.

## 6. Verification

- [x] 6.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 6.2 Validate OpenSpec change artifacts.
