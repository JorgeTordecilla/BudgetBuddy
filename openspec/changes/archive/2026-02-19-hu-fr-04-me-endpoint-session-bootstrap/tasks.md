## 1. Contract Updates

- [x] 1.1 Add `GET /me` path in `backend/openapi.yaml` with `200`, `401`, and `406` responses and canonical media types.
- [x] 1.2 Reuse existing `User` schema for `200 application/vnd.budgetbuddy.v1+json` response body (no new wrapper schema).
- [x] 1.3 Ensure `401 unauthorized` and `406 not-acceptable` responses reference canonical `application/problem+json` examples/catalog entries.
- [x] 1.4 Document `X-Request-Id` response header behavior for `GET /me` success and error responses.
- [x] 1.5 Mirror all OpenAPI updates into `openspec/specs/openapi.yaml`.

## 2. Backend Implementation

- [x] 2.1 Implement authenticated `GET /me` handler in the auth/session router using existing bearer-auth dependency.
- [x] 2.2 Return current user identity payload matching existing `User` serialization and vendor media-type behavior.
- [x] 2.3 Ensure request-id propagation remains intact so `/me` responses include `X-Request-Id` consistently.
- [x] 2.4 Keep login/refresh/logout behavior unchanged (additive-only endpoint change).

## 3. Tests

- [x] 3.1 Add integration test: `GET /me` with valid bearer token returns `200` and expected user payload.
- [x] 3.2 Add integration test: `GET /me` without valid token returns canonical `401` ProblemDetails.
- [x] 3.3 Add/extend integration test for `GET /me` unsupported `Accept` returning canonical `406` (if not already covered by shared negotiation tests).
- [x] 3.4 Assert `X-Request-Id` is present on `/me` responses for success and error paths.
- [x] 3.5 Add regression test/assertion that existing auth flows (login/refresh/logout) remain behaviorally unchanged.

## 4. Verification

- [x] 4.1 Run backend tests from `backend` with `.venv\Scripts\python.exe -m pytest`.
- [x] 4.2 Run coverage from `backend` with `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 4.3 Run OpenSpec change validation for `hu-fr-04-me-endpoint-session-bootstrap` and resolve warnings before apply/archive.
