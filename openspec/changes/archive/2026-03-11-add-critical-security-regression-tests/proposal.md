## Why

Several critical backend security protections already exist in runtime behavior, but their regression coverage is uneven. Some acceptance criteria are already protected by integration tests, while others are only partially covered or not encoded with the exact contract semantics we want to preserve.

This creates a risk that future refactors silently weaken security behavior without obvious product breakage.

## What Changes

- Add or tighten backend regression tests for the most critical auth, validation, and rollover safety paths.
- Preserve current runtime behavior where coverage already exists, but make traceability explicit in OpenSpec.
- Clarify the exact contract expectation for expired-token handling in both refresh-token and bearer-token flows (`401`, never `500`) and invalid rollover month handling (`400`, canonical ProblemDetails).
- Keep API paths, success payloads, and media types unchanged unless a missing canonical error mapping must be normalized to satisfy the new test.

## Capabilities

### New Capabilities
- `backend-security-regression-coverage`: Defines the minimum regression coverage expected for high-risk backend security flows.

### Modified Capabilities
- `audit-trail`: Extend scenarios to make refresh-token reuse audit coverage explicit.
- `auth-rate-limiting`: Extend scenarios to make deterministic lockout-after-N-attempts coverage explicit.
- `auth-session-management`: Extend scenarios to make expired-token `401` behavior explicit for protected auth/session flows.
- `budget-domain-management`: Extend transaction money-invariant scenarios to make negative `amount_cents` rejection on create explicit as a regression guard.
- `backend-rollover-management`: Extend rollover validation scenarios to require canonical `400` behavior for invalid month values.

## Impact

- Backend tests:
  - `backend/tests/test_api_integration.py`
  - Potentially `backend/tests/test_contract_openapi.py` if contract assertions need expansion
- OpenSpec artifacts:
  - New delta specs under `openspec/changes/add-critical-security-regression-tests/specs/`
- API/OpenAPI:
  - No new endpoints
  - No success-schema or media-type changes expected
  - Possible canonical-error normalization for rollover invalid-month handling if current runtime does not already return `400`
- Backwards compatibility:
  - Intended to be test hardening first
  - Any runtime change should be limited to error normalization already consistent with existing contract conventions
