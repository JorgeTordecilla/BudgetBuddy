## 1. Contract Updates

- [x] 1.1 Update `POST /auth/register` success schema in `backend/openapi.yaml` from `AuthResponse` to `AuthSessionResponse`.
- [x] 1.2 Add `Set-Cookie` response header mapping on register success consistent with `bb_refresh` cookie transport.
- [x] 1.3 Remove `refresh_token` from register success examples and keep examples schema-valid.
- [x] 1.4 Mirror the same OpenAPI updates in `openspec/specs/openapi.yaml`.

## 2. Backend Runtime

- [x] 2.1 Update register handler to return session payload (`user`, `access_token`, `access_token_expires_in`) without `refresh_token`.
- [x] 2.2 Set refresh cookie on register success using existing hardened cookie helper.
- [x] 2.3 Remove/adjust obsolete runtime helper/schema usage related to register body `refresh_token` where safe.

## 3. Tests

- [x] 3.1 Update integration helpers/tests to parse refresh token from register `Set-Cookie` instead of response JSON.
- [x] 3.2 Add/adjust test assertions that register success body excludes `refresh_token`.
- [x] 3.3 Add/adjust contract tests asserting register OpenAPI mapping uses `AuthSessionResponse` plus `Set-Cookie` header.
- [x] 3.4 Ensure login/refresh/logout behavior tests remain green and unchanged.

## 4. Verification

- [x] 4.1 Run backend tests from `backend` with `.venv\Scripts\python.exe -m pytest`.
- [x] 4.2 Run coverage from `backend` with `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 4.3 Run OpenSpec validation for `hu-fr-05-register-session-response` and resolve warnings before apply/archive.
