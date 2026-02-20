## 1. Contract updates

- [x] 1.1 Update `auth-session-management` spec to require JWT-standard bearer access tokens.
- [x] 1.2 Update `api-http-contract` wording to clarify bearer token interoperability expectations.

## 2. Backend rollout plan

- [x] 2.1 Implement JWT encoder/decoder with explicit algorithm allowlist.
- [x] 2.2 Enforce JWT-only verifier and reject legacy token formats.
- [x] 2.3 Remove legacy compatibility toggles from runtime settings.

## 3. Tests

- [x] 3.1 Add unit tests for JWT claim and signature validation paths.
- [x] 3.2 Add integration tests: valid JWT accepted, malformed/expired JWT rejected with canonical 401.
- [x] 3.3 Add tests proving legacy token formats are rejected.

## 4. Verification

- [x] 4.1 Run full test suite and coverage target.
- [x] 4.2 Validate OpenSpec change before archive.
