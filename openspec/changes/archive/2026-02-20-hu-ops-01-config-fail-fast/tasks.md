## 1. Runtime validation

- [x] 1.1 Enforce required critical env vars (`DATABASE_URL`, `JWT_SECRET`, and refresh cookie settings as applicable).
- [x] 1.2 Add production-only fail-fast checks (`DEBUG` disallowed, insecure cookie/CORS settings rejected).
- [x] 1.3 Validate cookie coherence (`SameSite=None` requires `Secure=true`).
- [x] 1.4 Ensure startup config log is emitted without secret leakage.

## 2. Tests

- [x] 2.1 Add/extend unit tests for missing required vars and invalid combinations.
- [x] 2.2 Add/extend tests for production safety rules and explicit error messages.
- [x] 2.3 Add/extend tests proving startup logs do not print secrets.

## 3. Documentation

- [x] 3.1 Update `DEPLOYMENT.md` with required variables and fail-fast behavior.

## 4. Verification

- [x] 4.1 Run full tests and verify coverage target.
- [x] 4.2 Validate OpenSpec change.
