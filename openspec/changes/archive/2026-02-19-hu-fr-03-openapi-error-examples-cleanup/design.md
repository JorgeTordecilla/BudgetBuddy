## Context

BudgetBuddy uses OpenAPI as the contract source for frontend, SDKs, and QA checks. Several `application/problem+json` responses currently point to mismatched examples (for example, `invalid-date-range` where `invalid-cursor` is the real error), which creates incorrect client-side error mapping. This change is contract-only: it must fix example correctness and reuse without changing runtime behavior, media types, or endpoint payload schemas.

## Goals / Non-Goals

**Goals:**
- Make every documented `application/problem+json` example match the canonical ProblemDetails identity (`type`, `title`, `status`) for that specific response.
- Standardize example reuse through `components/examples` and canonical catalog references, minimizing duplicated inline examples.
- Ensure `429` responses include `Retry-After` header documentation where throttling is declared.
- Keep `backend/openapi.yaml` and `openspec/specs/openapi.yaml` aligned.
- Preserve contract-first behavior and existing response media types.

**Non-Goals:**
- No runtime changes in FastAPI handlers, middleware, or error helpers.
- No new domain error types beyond the existing catalog.
- No change to success/error schema structures (`application/vnd.budgetbuddy.v1+json`, `application/problem+json`).
- No mandatory new runtime tests; verification remains spec/validation focused.

## Decisions

### 1. Use canonical mapping by response context
For each endpoint response that returns `application/problem+json`, map examples by rule:
- `400 invalid-cursor` only on cursor endpoints.
- `400 invalid-date-range` only where `from/to` validation is present.
- `409` examples tied to the concrete business conflict declared by that operation (`account-archived`, `category-archived`, `category-type-mismatch`, `budget-duplicate`, etc.).
- `401`, `403`, `406`, and `429` examples only where those statuses exist.

Rationale: this removes ambiguous examples and keeps frontend error mapping deterministic.
Alternative considered: keep generic `400`/`409` examples per status. Rejected because it preserves ambiguity and UI misclassification.

### 2. Prefer shared examples in components
Use reusable `components/examples/*` (or catalog-backed reusable structures) and reference them from responses, instead of repeating endpoint-specific inline bodies.

Rationale: shared examples reduce drift and simplify future error catalog updates.
Alternative considered: endpoint-local examples everywhere. Rejected due to high duplication and higher maintenance cost.

### 3. Keep catalog as the canonical identity source
`problem-details-catalog` remains the source of truth for exact `type/title/status`. Endpoint examples must reference or mirror those canonical identities exactly.

Rationale: contract-first consistency depends on one canonical identity source.
Alternative considered: allow endpoint-specific wording variance in titles/details. Rejected because it weakens cross-endpoint consistency.

### 4. Add quality-gate expectation for example correctness
In `openapi-quality-gates`, document that ProblemDetails examples must match the declared response meaning and canonical catalog identity.

Rationale: prevents recurrence of mismatched examples after future edits.
Alternative considered: rely only on manual review. Rejected due to repeated drift risk.

## Risks / Trade-offs

- [Risk] Some endpoints may have multiple valid `409` conflicts, making a single example potentially incomplete -> Mitigation: use the dominant operation-specific conflict example and keep catalog references clear for additional conflict variants.
- [Risk] Example refactoring can break SDK/example tooling assumptions -> Mitigation: run existing OpenAPI validation and SDK drift checks before archiving.
- [Risk] Over-documenting headers may create noisy specs -> Mitigation: limit explicit header docs to relevant statuses, especially `429` with `Retry-After`.

## Migration Plan

1. Update `backend/openapi.yaml` error response examples and `429` header docs per endpoint.
2. Mirror equivalent changes in `openspec/specs/openapi.yaml`.
3. Add/adjust reusable examples in `components/examples` as needed and replace stale inline examples.
4. Update OpenSpec delta specs for:
   - `api-http-contract`
   - `problem-details-catalog`
   - `openapi-quality-gates`
5. Run OpenSpec verify and existing OpenAPI validation checks.

Rollback:
- Revert only OpenAPI/spec files modified by this change; runtime remains unaffected.

## Open Questions

- Should we add an automated lint rule that enforces `problem+json` example-to-catalog matching by status/type, or keep it as a documented quality gate for now?
- For endpoints with multiple legitimate conflict types, do we want one representative example or multiple named examples under the same response content?
