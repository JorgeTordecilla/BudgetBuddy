## 1. Contract and Configuration

- [x] 1.1 Add CORS contract notes in `backend/openapi.yaml` for credentialed cross-site behavior (explicit origins, credentials, preflight, exposed headers).
- [x] 1.2 Mirror OpenAPI updates into `openspec/specs/openapi.yaml`.
- [x] 1.3 Add configuration parsing for `BUDGETBUDDY_CORS_ORIGINS` with development default `http://localhost:5173`.

## 2. Runtime Implementation

- [x] 2.1 Configure `CORSMiddleware` in app startup using explicit allowlist (no wildcard) with `allow_credentials=true`.
- [x] 2.2 Enforce allow methods: `GET,POST,PATCH,DELETE,OPTIONS`.
- [x] 2.3 Enforce allow headers: `Authorization,Content-Type,Accept,X-Request-Id`.
- [x] 2.4 Expose response headers: `X-Request-Id,Retry-After`.

## 3. Tests

- [x] 3.1 Add integration preflight test for `OPTIONS /api/auth/refresh` with `Origin: http://localhost:5173` and assert CORS headers.
- [x] 3.2 Add integration real-request test (auth login or refresh) asserting `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials`.
- [x] 3.3 Add assertion coverage for `Access-Control-Expose-Headers` containing `X-Request-Id` and `Retry-After`.

## 4. Verification

- [x] 4.1 Run full backend tests from `backend` with `.venv\Scripts\python.exe -m pytest`.
- [x] 4.2 Run coverage from `backend` with `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 4.3 Run OpenSpec validation for the change and ensure no artifact/schema warnings before apply/archive.
