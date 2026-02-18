## 1. OpenSpec alignment and error contract

- [x] 1.1 Define centralized account-archived ProblemDetails constants (type/title/status) in `app/errors.py` or equivalent shared module
- [x] 1.2 Ensure API error mapping keeps `application/problem+json` and exposes exact canonical fields for account-archived conflict

## 2. Transaction rule implementation

- [x] 2.1 Update transaction account validation to detect `account.archived_at != null` and raise dedicated 409 APIError
- [x] 2.2 Keep existing transaction create behavior unchanged for non-archived accounts and other conflict paths

## 3. Tests and verification

- [x] 3.1 Add integration test: create account -> archive account -> POST /transactions with that `account_id`
- [x] 3.2 Assert response is `409`, `Content-Type: application/problem+json`, and exact `type/title/status`
- [x] 3.3 Run test suite with coverage and verify overall coverage remains >= 90%
