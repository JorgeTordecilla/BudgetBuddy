## 1. Spec Traceability

- [x] 1.1 Add a new delta spec `backend-security-regression-coverage` that enumerates the five critical flows as regression requirements.
- [x] 1.2 Extend `audit-trail` with an explicit scenario tying refresh-token reuse detection to persisted `auth.refresh_token_reuse_detected` audit actions.
- [x] 1.3 Extend `auth-rate-limiting` with an explicit scenario tying configured login threshold exceedance to deterministic blocking after N attempts.
- [x] 1.4 Extend `auth-session-management` with an explicit scenario requiring expired tokens to resolve to canonical `401` ProblemDetails rather than `500`.
- [x] 1.5 Extend `budget-domain-management` with an explicit scenario requiring negative `amount_cents` rejection on transaction create by money-invariant domain validation.
- [x] 1.6 Extend `backend-rollover-management` with an explicit scenario requiring invalid month input to return canonical `400`.

## 2. Backend Tests

- [x] 2.1 Reuse or strengthen the existing integration test covering refresh-token reuse audit emission in `backend/tests/test_api_integration.py`.
- [x] 2.2 Reuse or strengthen the existing integration test covering login rate limiting after the configured threshold.
- [x] 2.3 Reuse or strengthen the existing integration test covering negative `amount_cents` rejection on transaction create.
- [x] 2.4 Add a dedicated integration test for invalid rollover month input with expected canonical `400` ProblemDetails.
- [x] 2.5 Reuse or strengthen the existing integration test covering expired refresh-token `401` behavior.
- [x] 2.6 Add a dedicated integration test proving an expired bearer access token on a protected endpoint (for example `GET /me`) returns canonical `401` and not `500`.

## 3. Verification

- [x] 3.1 Run targeted backend tests for the affected scenarios from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest tests/test_api_integration.py -k "refresh or rate_limit or amount or rollover or expired or me"`
- [x] 3.2 Run full backend regression suite from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest`
- [x] 3.3 Record whether rollover invalid-month behavior required runtime normalization or was already compliant.

Verification notes:
- Implementation completed.
- Rollover runtime was normalized so invalid `month` and `source_month` values are validated in the router and mapped to canonical `invalid-date-range` `400` responses instead of generic schema-validation errors.
- User-verified full backend regression run passed on 2026-03-11: `python -m pytest` -> `199 passed in 86.25s`.
- This confirms the rollover invalid-month normalization did not regress the existing backend suite.
