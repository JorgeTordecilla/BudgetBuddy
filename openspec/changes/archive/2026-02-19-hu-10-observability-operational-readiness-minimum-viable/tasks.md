## 1. Contract Updates

- [x] 1.1 Update `backend/openapi.yaml` and `openspec/specs/openapi.yaml` to document `X-Request-Id` response header on API endpoints
- [x] 1.2 Document request-id propagation behavior (incoming header preserved, generated otherwise)
- [x] 1.3 Keep success/error media types unchanged (`application/vnd.budgetbuddy.v1+json` and `application/problem+json`)

## 2. Runtime Implementation

- [x] 2.1 Add lightweight request-id middleware in `backend/app/main.py`
- [x] 2.2 Ensure every response includes `X-Request-Id` (success and error paths)
- [x] 2.3 Add/update centralized API error logging to emit structured fields: `request_id`, `path`, `status`, `problem_type`
- [x] 2.4 Add sanitization for `ProblemDetails.detail` to avoid stack traces/tokens/secrets
- [x] 2.5 Ensure logs do not include authorization tokens or secret-like values

## 3. Integration Tests

- [x] 3.1 Add test: successful endpoint response includes `X-Request-Id`
- [x] 3.2 Add test: error endpoint response (401 or 406) includes `X-Request-Id`
- [x] 3.3 Add test: client-provided `X-Request-Id` is propagated unchanged
- [x] 3.4 Add/adjust test to confirm error detail sanitization policy is respected

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm all tests pass and coverage remains `>= 90%`
