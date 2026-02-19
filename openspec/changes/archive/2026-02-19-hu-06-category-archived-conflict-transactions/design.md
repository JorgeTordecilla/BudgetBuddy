## Context

The transaction write flow already validates ownership and business conflicts such as archived account and category/type mismatch. Category archival conflict must be enforced with the same rigor and canonical ProblemDetails contract on both create and patch paths.

Current architectural constraints:
- Contract-first (`backend/openapi.yaml`, mirror in `openspec/specs/openapi.yaml`)
- Canonical errors through shared helpers in `app/errors.py`
- Error payload media type `application/problem+json`
- Coverage gate `>= 90%`

## Goals / Non-Goals

**Goals:**
- Guarantee archived-category conflict on `POST /transactions` and effective `PATCH /transactions/{transaction_id}`.
- Return exact canonical ProblemDetails (`type/title/status`) for category-archived conflict.
- Ensure create and patch use the same business-rule validation path.
- Provide directional test matrix and keep test/coverage gates passing.

**Non-Goals:**
- No changes to auth model or ownership policy.
- No change to vendor success media type or response schemas.
- No new domain entities.

## Decisions

### Decision 1: Reuse centralized category-archived helper
Use `category_archived_error()` from `app/errors.py` as the single conflict emitter.

Rationale:
- Ensures exact canonical values without duplication.
- Keeps category-archived aligned with other 409 canonical conflicts.

Alternatives:
- Inline `APIError` in router: rejected (drift risk).

### Decision 2: Validate patch using effective final state
Patch conflict validation evaluates resolved final values:
- changed `category_id` path
- unchanged `category_id` where linked category is archived

Rationale:
- Prevents bypasses via partial updates.
- Keeps behavior deterministic and consistent with write invariants.

Alternatives:
- Validate only when `category_id` present in payload: rejected (misses keep-path conflict).

### Decision 3: Shared validation function for create and patch
Both endpoints call the same business-rule validator for account/category/type constraints.

Rationale:
- Eliminates duplicated branching.
- Reduces future regressions.

Alternatives:
- Separate create/patch checks: rejected (logic drift and missing parity).

## Risks / Trade-offs

- [Risk] Patch effective-state branch can regress if partial-update logic changes.
  - Mitigation: keep explicit integration tests for both change-path and keep-path conflicts.
- [Risk] Contract and runtime can diverge on canonical fields.
  - Mitigation: assert exact `type/title/status` in tests.
- [Trade-off] Slightly stricter write behavior may surface hidden client assumptions.
  - Mitigation: canonical 409 payload gives deterministic remediation path.

## Migration Plan

1. Ensure canonical constants/helper for category-archived conflict exist and are used.
2. Align transaction business-rule validation so create/patch share the same path.
3. Add/update integration tests:
   - create with archived category
   - patch to archived category
   - patch keep-path when existing category becomes archived
4. Run pytest + coverage from `backend/.venv`.
5. Update tasks/spec status.

Rollback:
- Revert change commit; no data migration required.

## Open Questions

- None for implementation; canonical values are already defined in current error taxonomy.
