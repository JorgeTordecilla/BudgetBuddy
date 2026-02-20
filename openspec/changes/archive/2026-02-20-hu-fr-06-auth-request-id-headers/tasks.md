## 1. Contract Updates

- [x] 1.1 Add `X-Request-Id` headers to `POST /auth/login` response mappings in `backend/openapi.yaml`.
- [x] 1.2 Add `X-Request-Id` headers to `POST /auth/refresh` response mappings in `backend/openapi.yaml`.
- [x] 1.3 Add `X-Request-Id` headers to `POST /auth/logout` response mappings in `backend/openapi.yaml`.
- [x] 1.4 Mirror all auth request-id header updates in `openspec/specs/openapi.yaml`.

## 2. Tests

- [x] 2.1 Add/extend integration tests asserting `X-Request-Id` is present on login/refresh/logout responses.
- [x] 2.2 Add/extend OpenAPI contract tests asserting `X-Request-Id` header mappings exist for login/refresh/logout responses.

## 3. Verification

- [x] 3.1 Run backend tests from `backend` with `.venv\Scripts\python.exe -m pytest`.
- [x] 3.2 Run coverage from `backend` with `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 3.3 Run OpenSpec validation for `hu-fr-06-auth-request-id-headers` and resolve warnings before archive.
