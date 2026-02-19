## 1. Canonical Error Definitions

- [x] 1.1 Add canonical `refresh-revoked` constants in `backend/app/errors.py` (`type/title/status`)
- [x] 1.2 Add helper(s) for revoked/reuse detection using `403` ProblemDetails
- [x] 1.3 Keep existing 401/403 canonical helpers and media type behavior unchanged

## 2. Refresh Rotation Runtime

- [x] 2.1 Implement refresh-token rotation on successful `POST /auth/refresh` (new access + new refresh)
- [x] 2.2 Invalidate previous refresh token immediately after successful rotation
- [x] 2.3 Detect replay/reuse and return canonical `403 refresh-revoked`
- [x] 2.4 Return canonical `401` for malformed/expired/signature-invalid refresh tokens

## 3. Token Persistence and Revocation

- [x] 3.1 Implement/adjust refresh token persistence layer for token state (active/revoked/used)
- [x] 3.2 Persist refresh tokens hashed (no raw token storage)
- [x] 3.3 Ensure O(1)-style lookup path (indexed hash lookup)
- [x] 3.4 Ensure logout revokes active refresh token(s)

## 4. Contract and Docs Alignment

- [x] 4.1 Update `backend/openapi.yaml` for `POST /auth/refresh` to document `401` and `403` ProblemDetails mappings
- [x] 4.2 Update `openspec/specs/openapi.yaml` mirror with same refresh mappings
- [x] 4.3 Add/adjust API spec narrative for refresh rotation and replay-protection policy

## 5. Tests

- [x] 5.1 Add integration test: refresh twice with same token -> first `200`, second canonical `403`
- [x] 5.2 Add integration test: expired refresh token -> canonical `401`
- [x] 5.3 Add integration test: logout revokes refresh token(s) -> subsequent refresh fails (`403` if revoked policy)
- [x] 5.4 Assert exact canonical `type/title/status` for `403 refresh-revoked` paths

## 6. Verification

- [x] 6.1 From `backend` with `.venv` activated, run `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 6.2 Confirm tests pass and overall coverage remains `>= 90%`
