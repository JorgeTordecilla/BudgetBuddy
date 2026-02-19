## Context

HU-12 hardens money correctness in transactions and analytics without changing the public API v1 contract. The system already models `amount_cents`, but domain validation must be stricter for create/patch, safe numeric bounds, and user currency consistency.

Key constraints:
- Contract-first source of truth: `backend/openapi.yaml` (mirrored at `openspec/specs/openapi.yaml`).
- Media types remain unchanged:
  - success: `application/vnd.budgetbuddy.v1+json`
  - errors: `application/problem+json`
- Money validation failures must return canonical `400` `ProblemDetails`.
- Analytics totals must be integer cents only (no floating-point rounding).

## Goals / Non-Goals

**Goals**
- Enforce strict `amount_cents` invariants (integer-only, safe bounds, and valid sign semantics).
- Enforce consistent user `currency_code` context in money write flows and analytics.
- Standardize canonical money-validation `400` `ProblemDetails` behavior.
- Preserve contract-first HTTP behavior (routes, payload shape, media types).
- Add integration coverage for invalid money values and canonical error assertions.

**Non-Goals**
- Introducing decimal money or rounding rules.
- API versioning changes or route changes.
- Redesigning broader financial data modeling beyond money invariants.
- Changing existing `409` business-conflict semantics unrelated to money validation.

## Decisions

- Decision: Centralize money validation in domain write flows.
  - Use one shared validation path for transaction create and patch.
  - Rationale: prevents rule drift across endpoints.
  - Alternative considered: endpoint-specific validation (rejected due to duplication and inconsistency risk).

- Decision: Enforce strict integer cents plus safe bounds.
  - Accept only integer `amount_cents` and enforce explicit min/max limits.
  - Enforce positive-only cents (`amount_cents > 0`) for both `income` and `expense`; transaction `type` carries semantic direction.
  - Rationale: deterministic arithmetic and prevention of extreme/overflow-like inputs.
  - Alternative considered: implicit numeric coercion/casting (rejected due to silent data corruption risk).

- Decision: Standardize canonical ProblemDetails taxonomy for money failures.
  - Map money validation failures to canonical `400` ProblemDetails constants:
    - `MONEY_AMOUNT_NOT_INTEGER`
    - `MONEY_AMOUNT_OUT_OF_RANGE`
    - `MONEY_AMOUNT_SIGN_INVALID`
    - `MONEY_CURRENCY_MISMATCH`
  - Rationale: stable client behavior and deterministic test assertions.
  - Alternative considered: free-form per-error messages (rejected as unstable and hard to validate).

- Decision: Keep analytics aggregation integer-only under a single user currency context.
  - Analytics aggregation consumes validated integer cents and never mixes currency contexts.
  - Rationale: prevents precision drift and multi-currency contamination in totals.
  - Alternative considered: multi-currency conversion inside analytics (out of scope for this HU).

- Decision: Preserve contract-first behavior while tightening validation.
  - Tighten validation semantics without changing media types, endpoint shapes, or success payload contract.
  - Rationale: avoids external contract regressions while improving correctness.
  - Alternative considered: introducing ad-hoc error formats (rejected due to catalog/contract drift).

## Risks / Trade-offs

- Risk: Previously tolerated invalid payloads now fail with `400`.
  -> Mitigation: explicit specs, clear test coverage, and canonical error responses.

- Risk: Divergence between framework-level schema validation and domain-level money validation.
  -> Mitigation: domain validator is source of truth; integration tests verify end-to-end behavior.

- Risk: Error details leak internal internals.
  -> Mitigation: sanitize `ProblemDetails.detail`; never include stack traces or sensitive internals.

- Trade-off: Stricter input validation reduces permissiveness.
  -> Mitigation: acceptable for financial correctness and deterministic behavior.

## Migration Plan

1. Update delta specs for modified capabilities.
2. Implement centralized money validation for transaction create/patch.
3. Wire canonical `400` money-validation ProblemDetails mapping.
4. Validate analytics integer-cents aggregation and currency consistency.
5. Add integration tests for invalid money values and canonical errors.
6. Run full test suite and coverage gate (`>= 90%`).
7. Rollback strategy: revert change commits; no DB migration rollback needed for this HU.

## Open Questions

- What exact safe min/max bounds should be product policy for `amount_cents`?
