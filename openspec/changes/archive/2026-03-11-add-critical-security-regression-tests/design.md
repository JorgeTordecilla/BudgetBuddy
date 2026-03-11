## Context

The requested change is primarily about preventing silent security regressions, not adding new product behavior. The backend already contains protections for refresh-token replay detection, auth rate limiting, positive-money invariants, and unauthorized handling for expired tokens. The main uncertainty is whether rollover month validation consistently maps invalid input to canonical `400` ProblemDetails instead of framework-level `422` validation or accidental `500` parsing failures.

Constraints:
- Prefer test-only hardening where behavior already exists.
- Preserve contract-first behavior and canonical ProblemDetails taxonomy.
- Keep assertions at HTTP level so status code, media type, and error envelope regressions are caught.

## Goals / Non-Goals

**Goals:**
- Make five critical flows explicitly covered and traceable:
  - refresh-token reuse writes `auth.refresh_token_reuse_detected` to audit history;
  - login rate limiting blocks after configured threshold;
  - negative `amount_cents` is rejected on transaction create by money-invariant domain validation;
  - invalid rollover month returns canonical `400`;
  - expired refresh tokens and expired bearer access tokens return `401`, never `500`.
- Minimize ambiguity about whether a criterion is already satisfied versus still requiring runtime change.
- Keep tests colocated in the existing backend integration suite.

**Non-Goals:**
- No frontend changes.
- No auth model redesign.
- No expansion of audit payload shape.
- No broad error-taxonomy rewrite outside the affected flows.

## Decisions

### D1. Use backend integration tests as the source of truth
Cover these flows in `backend/tests/test_api_integration.py` because unit tests would miss the exact HTTP contract and middleware/error-handler behavior.

### D2. Treat existing passing coverage as part of the change scope
If a requested acceptance criterion is already covered, do not duplicate coverage blindly. Instead, either tighten the existing test name/assertions or add spec deltas that make the intended guarantee explicit.

### D3. Normalize expired-token expectations around canonical unauthorized behavior
Both refresh-token expiry and protected-endpoint access-token expiry should be treated as unauthorized conditions. The regression goal is that decode/validation failures remain mapped to `401` ProblemDetails and never escape as `500`, with dedicated coverage for each flow because they are enforced through different code paths.

### D4. Make rollover invalid-month behavior explicit at the contract boundary
Inputs like `2026-13` or `2026-00` should produce canonical `400` invalid-date-range behavior. If regex-level validation currently produces `422` for some malformed values, decide whether to narrow the requirement to semantically invalid `YYYY-MM` values or normalize all invalid month inputs to `400`.

### D5. Keep negative-amount wording aligned to runtime architecture
Transaction create requests already use `StrictInt`, but negative-value rejection is enforced by money-domain validation rather than by schema parsing alone. The change artifacts should describe this as a money-invariant/domain-validation protection to avoid encoding the wrong architectural guarantee.

## Risks / Trade-offs

- **[Risk]** Duplicate tests for already-covered behavior add maintenance cost without increasing signal.  
  **Mitigation:** prefer strengthening or reusing existing tests where coverage already exists.

- **[Risk]** Invalid-month assertions may expose a real contract mismatch (`422` vs `400`).  
  **Mitigation:** encode the intended rule clearly in spec before implementation so the runtime fix is scoped and deliberate.

- **[Risk]** “Expired token” coverage could accidentally regress only one code path if a single combined test is used.  
  **Mitigation:** require separate regression tests for expired refresh token and expired bearer access token.

## Migration Plan

1. Add/change OpenSpec delta scenarios to define the intended regression guarantees.
2. Add or tighten integration tests in `backend/tests/test_api_integration.py`.
3. If rollover invalid-month behavior does not meet the intended contract, implement the smallest normalization change required.
4. Run targeted backend tests, then full backend regression suite from `backend/.venv`.

Rollback strategy:
- Revert added tests/spec deltas if they prove misaligned.
- If a runtime normalization change is required, it can be reverted independently because no schema/data migration is involved.

## Open Questions

- For malformed month inputs that fail the query regex entirely, do we want canonical `400` or is framework-level `422` acceptable as long as semantic month-range errors return `400`?
