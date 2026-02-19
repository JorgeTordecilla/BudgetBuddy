## 1. Contract Changes

- [x] 1.1 Update `backend/openapi.yaml` auth endpoints to document cookie-based refresh transport (`bb_refresh`) with `Set-Cookie` headers on login/refresh and cookie-expiry header on logout.
- [x] 1.2 Update auth request/response schemas and examples so login/refresh success payloads exclude `refresh_token` and refresh request body is not required.
- [x] 1.3 Mirror OpenAPI updates into `openspec/specs/openapi.yaml` and ensure contract text remains canonical for media types and ProblemDetails.

## 2. Backend Runtime

- [x] 2.1 Add/adjust auth cookie settings (`name`, `path`, `secure`, `samesite`, `max_age`, optional domain) in backend settings/config.
- [x] 2.2 Implement login handler changes to issue `bb_refresh` cookie and return only access-token JSON fields.
- [x] 2.3 Implement refresh handler to read cookie, enforce canonical 401/403 behavior, rotate refresh session, and re-issue cookie.
- [x] 2.4 Implement logout handler to revoke refresh state and expire `bb_refresh` cookie with deterministic `Set-Cookie` attributes.
- [x] 2.5 Keep existing auth rate-limit/replay protections compatible with cookie transport and preserve canonical error payloads.

## 3. SDK and Tooling

- [x] 3.1 Regenerate `sdk/typescript` and `sdk/python` from updated OpenAPI.
- [x] 3.2 Update SDK/docs/commands if needed so local regeneration and CI drift checks remain deterministic.

## 4. Tests

- [x] 4.1 Add integration tests: login sets `bb_refresh` cookie with `HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, and expected Max-Age.
- [x] 4.2 Add integration tests: refresh succeeds without JSON body when cookie is present, rotates cookie, and returns new access token payload.
- [x] 4.3 Add integration tests: refresh without cookie returns canonical `401` ProblemDetails; revoked/reused cookie token returns canonical `403`.
- [x] 4.4 Add integration tests: logout expires `bb_refresh` cookie via `Max-Age=0` and returns `204` with no body.
- [x] 4.5 Update/extend contract tests to assert OpenAPI auth examples/headers/schemas reflect cookie transport and no `refresh_token` in login/refresh response models.

## 5. Verification

- [x] 5.1 Run backend test suite from `backend` with `.venv\Scripts\python.exe -m pytest`.
- [x] 5.2 Run coverage from `backend` with `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 5.3 Run OpenSpec validation for the change and ensure no artifact/schema warnings before archive.
