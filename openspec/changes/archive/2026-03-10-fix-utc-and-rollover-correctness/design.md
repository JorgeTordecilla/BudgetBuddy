## Context

The backend still has a small cluster of correctness issues that span UTC handling, authorization semantics, and rollover maintainability. Savings deadline validation and contribution transaction dates still use `date.today()` instead of the backend's UTC-oriented time helpers, rollover ownership failures still return `409` where `403 Forbidden` is semantically correct, and `_normalize_rollover_source` still mutates a session-bound SQLAlchemy object without documenting that contract for future callers.

## Goals / Non-Goals

**Goals:**
- Align savings deadline validation and contribution-created transaction dates with UTC-derived current date semantics.
- Correct rollover ownership semantics so foreign account/category references return canonical `403`.
- Preserve `409` for archived owned rollover resources, since those remain business-rule conflicts.
- Make `_normalize_rollover_source` mutation semantics explicit for maintainers.
- Fix the adjacent PEP 8 formatting issue in `money.py`.

**Non-Goals:**
- No changes to savings goal response shape or contributions pagination.
- No changes to rollover surplus calculation, idempotency, or persistence model.
- No refactor of `_normalize_rollover_source` beyond documenting its contract.
- No broader money-domain redesign.

## Decisions

### D1. Savings date comparisons use UTC-derived current date
Both savings deadline validation and the internal contribution transaction date will use `utcnow().date()` rather than `date.today()`.

Rationale:
- the backend already uses UTC helpers elsewhere;
- `date.today()` depends on server-local timezone and can drift around midnight in non-UTC deployments;
- `utcnow()` is already imported in `savings.py`.

Alternative considered:
- keep `date.today()` and rely on UTC server configuration.
  - Rejected because correctness should not depend on deployment timezone discipline.

### D2. Rollover ownership failures return 403
If rollover apply receives an account or category that does not belong to the authenticated user, the endpoint will return canonical `403 Forbidden`.

Rationale:
- foreign-resource checks are authorization failures, not business-rule conflicts;
- this aligns rollover semantics with the rest of the backend ownership policy.

Alternative considered:
- keep the existing generic `409`.
  - Rejected because it hides the difference between access control failure and invalid owned-resource state.

### D3. Archived owned rollover resources remain 409
If the resource exists, belongs to the authenticated user, but is archived, rollover apply will continue returning `409 Conflict`.

Rationale:
- archived-resource usage is still a business-rule conflict;
- preserving `409` keeps state invalidity separate from access control.

### D4. `_normalize_rollover_source` keeps current behavior but documents its contract
The helper remains in place, but its docstring must state that it mutates a session-bound ORM object and relies on caller commit.

Rationale:
- current runtime behavior is already correct in existing call sites;
- the primary risk is future misuse due to implicit mutation semantics.

Alternative considered:
- inline the normalization logic into `rollover_apply`.
  - Rejected for this scope because the issue is documentation clarity, not flow shape.

### D5. `money.py` formatting is corrected opportunistically
The missing blank line between module constants and the first function in `money.py` will be fixed while touching adjacent backend correctness work.

Rationale:
- trivial cleanup;
- avoids leaving obvious formatting debt in the same patch set.

## Risks / Trade-offs

- [Observable contract change in rollover] -> Update specs and tests so `403` vs `409` semantics are explicit and regression-protected.
- [UTC tests can become flaky if they depend on wall clock] -> Prefer deterministic monkeypatching of `utcnow()` in tests.
- [Docstring-only contract could still be ignored by future refactors] -> Keep the wording explicit and cover current behavior with rollover tests so misuse is easier to notice.
