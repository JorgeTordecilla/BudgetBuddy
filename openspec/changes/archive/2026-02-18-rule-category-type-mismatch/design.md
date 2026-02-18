## Context

Transaction validation already checks that `transaction.type` matches `category.type`, but the mismatch path is emitted as a generic conflict shape. Clients need a stable, machine-readable ProblemDetails variant for this specific rule, similar to the canonical handling already introduced for archived accounts.

## Goals / Non-Goals

**Goals:**
- Define canonical ProblemDetails for category/type mismatch conflicts.
- Keep mismatch validation centralized in transaction business-rule checks.
- Ensure conflict response uses `application/problem+json` through the global API error handler.
- Add deterministic tests for exact `type`, `title`, and `status`.

**Non-Goals:**
- Changing other conflict semantics (account ownership, archived category, or other validation paths).
- Introducing new endpoints or persistence changes.
- Changing media type strategy outside existing error contract.

## Decisions

1. Centralize mismatch problem constants
- Decision: store `type`, `title`, `status` metadata for category/type mismatch in shared error constants/helpers.
- Rationale: avoids duplicate literals and ensures exact response contract.
- Alternative considered: inline APIError fields in router. Rejected due to drift risk.

2. Preserve global ProblemDetails rendering path
- Decision: raise `APIError` from business-rule validation and continue using global exception handlers.
- Rationale: keeps consistent content-type and payload envelope across all errors.
- Alternative considered: direct `JSONResponse` in route. Rejected as inconsistent with existing architecture.

3. Scope canonicalization to mismatch case only
- Decision: only specialize the type-mismatch path, leaving other conflicts generic.
- Rationale: minimal, low-risk contract change with clear client value.
- Alternative considered: canonical types for every conflict path in this change. Rejected due to broader scope.

## Risks / Trade-offs

- [Overlapping conflict rules could be misclassified] -> Mitigation: keep mismatch check explicit and ordered after owned category/account checks.
- [Client dependency on exact wording] -> Mitigation: versioned problem type URL and constants in one place.
- [Partial test coverage of conflict variants] -> Mitigation: add integration test for mismatch flow with exact field assertions.

## Migration Plan

1. Add category-type-mismatch ProblemDetails constants/helper.
2. Update transaction validation to raise dedicated mismatch error.
3. Add integration test for mismatch case and exact payload checks.
4. Run test suite with coverage to confirm no regressions.

Rollback:
- Revert helper, router, and tests if regression is found; no DB rollback needed.

## Open Questions

- Should patch flows that change `type` or `category_id` enforce the same canonical mismatch error in this change, or follow-up change?
