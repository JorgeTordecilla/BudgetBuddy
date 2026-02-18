## Context

Current transaction validation blocks archived accounts and type mismatch, but does not consistently block archived categories in all write paths. The desired behavior is a symmetric domain rule: archived categories cannot be used for new or updated transactions.

## Goals / Non-Goals

**Goals:**
- Enforce archived-category rejection on transaction create and patch.
- Reuse a single validation path so create/patch behavior cannot diverge.
- Emit canonical ProblemDetails (`409`) for archived-category conflicts.
- Preserve `application/problem+json` on errors and vendor media type on successful responses.

**Non-Goals:**
- No change to auth policy (401/403 behavior remains as currently defined).
- No endpoint additions.
- No changes to account-archived or category-type-mismatch semantics beyond non-regression.

## Decisions

1. Add centralized canonical error helper
- Decision: define `CATEGORY_ARCHIVED_*` constants + `category_archived_error()` in `backend/app/errors.py`.
- Rationale: single source of truth for contract-critical ProblemDetails fields.
- Alternative considered: inline `APIError` in router. Rejected due duplication and drift risk.

2. Validate effective final state in create and patch
- Decision: use shared business-rule validation for both `POST /transactions` and `PATCH /transactions/{transaction_id}`.
- Rationale: guarantees identical enforcement for category-archived across write operations.

3. Patch semantics based on resolved category
- Decision: on patch, compute effective category (`payload.category_id` or existing transaction category) and reject if archived.
- Rationale: catches both explicit category changes and implicit keep-existing cases when category became archived later.

4. Keep lookup efficient
- Decision: category ownership + archived check remains single query in validation path.
- Rationale: avoid extra DB round trips and N+1 patterns.

## Risks / Trade-offs

- [False negatives if patch path bypasses validator] -> Mitigation: ensure both write handlers call same validator.
- [Regression on existing business conflicts] -> Mitigation: keep current account-archived and type-mismatch tests; add focused archived-category tests.
- [Contract drift if OpenAPI not updated] -> Mitigation: include OpenAPI update task and verification in DoD.
