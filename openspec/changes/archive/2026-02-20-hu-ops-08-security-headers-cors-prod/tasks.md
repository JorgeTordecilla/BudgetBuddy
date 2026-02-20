## 1. Contract and documentation

- [x] 1.1 Document CORS policy constraints (strict allowlist, credentials enabled, minimal exposed headers).
- [x] 1.2 Document security response headers and intended values.

## 2. Runtime behavior

- [x] 2.1 Add baseline security headers middleware for API responses.
- [x] 2.2 Keep CORS production behavior strict and environment-driven.
- [x] 2.3 Ensure no regressions in auth/session and existing response contracts.

## 3. Tests

- [x] 3.1 Add integration tests asserting security header presence.
- [x] 3.2 Add integration tests for allowed/disallowed CORS origins and exposed headers.

## 4. Verification

- [x] 4.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 4.2 Validate OpenSpec change artifacts.
