## Why

Error responses for `401`, `403`, and `406` are currently valid ProblemDetails but not consistently canonicalized by `type/title/status` across auth, ownership, and Accept checks. Canonizing them now locks contract stability and enables strict integration assertions.

## What Changes

- Define canonical ProblemDetails for `401 Unauthorized`, `403 Forbidden`, and `406 Not Acceptable`.
- Centralize helper constructors in `app/errors.py` (or shared error module) and use them in:
  - `enforce_accept_header`
  - `get_current_user`
  - Ownership checks (`_owned_*_or_403`) in domain routers.
- Update restore-category integration tests to assert exact canonical `type/title/status` for `401/403/406` in addition to media type.
- Keep `application/problem+json` for errors and `application/vnd.budgetbuddy.v1+json` for successful payload responses.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: canonical ProblemDetails semantics for `401/403/406` and strict assertions in restore category flows.
- `budget-domain-management`: ownership/auth restore-category scenarios tied to canonical `401/403` responses.

## Impact

- Affected code: `backend/app/errors.py`, `backend/app/dependencies.py`, `backend/app/routers/{accounts,categories,transactions}.py`.
- Affected tests: `backend/tests/test_api_integration.py` (restore category matrix assertions for exact canonical fields).
- Backward compatibility: status codes and media types remain unchanged; payload canonicalization becomes stricter and more predictable.
