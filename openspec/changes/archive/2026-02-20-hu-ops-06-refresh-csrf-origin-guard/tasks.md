## 1. Contract and catalog

- [x] 1.1 Update OpenAPI for `POST /auth/refresh` to document origin-guarded `403` ProblemDetails outcome.
- [x] 1.2 Add canonical ProblemDetails catalog entry for origin-blocked refresh (`origin-not-allowed`).

## 2. Runtime behavior

- [x] 2.1 Add configurable origin allowlist for refresh guard (`AUTH_REFRESH_ALLOWED_ORIGINS`).
- [x] 2.2 Add configurable missing-origin mode (`AUTH_REFRESH_MISSING_ORIGIN_MODE=deny|allow_trusted`).
- [x] 2.3 Enforce origin guard on refresh endpoint before refresh-token state mutation.
- [x] 2.4 Keep existing refresh-cookie invalid/expired behavior unchanged (`401` canonical).

## 3. Tests

- [x] 3.1 Add integration test: allowed origin can refresh successfully.
- [x] 3.2 Add integration test: disallowed origin returns canonical `403` ProblemDetails.
- [x] 3.3 Add integration tests for missing-origin behavior in both modes.
- [x] 3.4 Add regression test: missing/invalid cookie remains canonical `401`.

## 4. Verification

- [x] 4.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 4.2 Validate OpenSpec change artifacts.
