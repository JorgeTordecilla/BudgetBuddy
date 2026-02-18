## Context

This change narrows one conflict path in transaction creation: archived accounts must reject new transactions with a deterministic ProblemDetails payload. Current behavior already returns `409` for business-rule conflicts, but the account-archived case is not distinguished with a stable `type/title` pair that clients can rely on.

## Goals / Non-Goals

**Goals:**
- Enforce `POST /transactions` rejection when `account.archived_at != null`.
- Use centralized error constants for the account-archived conflict.
- Return exact ProblemDetails values for this case (`type`, `title`, `status`) with `application/problem+json`.
- Add integration coverage for account archive -> transaction create conflict flow.

**Non-Goals:**
- Changing non-archived conflict semantics (for example category/type mismatch) beyond existing behavior.
- Introducing new media types or changing auth behavior.
- Modifying read/list semantics for archived resources.

## Decisions

1. Centralize account-archived error metadata
- Decision: define constant metadata in `app/errors.py` (or equivalent module) for `type`, `title`, `status`.
- Rationale: avoids scattered literals and ensures exact contract values across handlers/tests.
- Alternative considered: inline literals in transactions router. Rejected due to drift risk.

2. Differentiate archived-account conflict from generic business conflicts
- Decision: when validating transaction account ownership/existence, if the account exists but is archived, raise dedicated account-archived API error.
- Rationale: explicit and testable contract path for clients.
- Alternative considered: continue returning generic conflict title/detail. Rejected because the rule requires exact ProblemDetails values.

3. Keep ProblemDetails rendering in global handler
- Decision: continue using existing APIError -> ProblemDetails exception handling pipeline.
- Rationale: preserves media-type and envelope consistency without duplicating response-building code.
- Alternative considered: return JSONResponse directly in router. Rejected due to bypassing centralized error semantics.

## Risks / Trade-offs

- [Over-specifying one conflict path] -> Mitigation: only specialize archived-account case; keep other conflicts generic.
- [Future copy/paste literals in other modules] -> Mitigation: require using centralized constants/helpers for problem definitions.
- [Test fragility from exact string assertions] -> Mitigation: assert only required canonical fields (`type`, `title`, `status`) for this rule.

## Migration Plan

1. Add centralized account-archived problem constants/helper.
2. Update transaction account validation to emit dedicated APIError for archived accounts.
3. Add integration test for create-account -> archive-account -> create-transaction conflict path.
4. Run test suite with coverage and confirm >= 90%.

Rollback:
- Revert router/helper change and the associated test if unexpected regressions occur. No data migration required.

## Open Questions

- Should we also define a dedicated problem `type` for archived categories in this release, or keep category conflicts generic for now?
