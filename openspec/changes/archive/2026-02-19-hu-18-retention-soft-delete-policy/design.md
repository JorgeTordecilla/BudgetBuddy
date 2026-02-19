## Context

BudgetBuddy currently uses archive semantics for soft-delete, but policy is only partially encoded across endpoints and analytics. HU-18 hardens consistency by defining one retention policy for archived resources and aligning runtime + contract behavior.

## Goals / Non-Goals

**Goals:**
- Standardize archived inclusion/exclusion behavior on accounts/categories/transactions list endpoints.
- Clarify archive delete semantics and wording in OpenAPI.
- Define explicit analytics policy for archived transactions.
- Add tests that lock policy behavior and prevent regressions.

**Non-Goals:**
- Introducing hard-delete endpoints.
- Changing media types or ProblemDetails model.
- Expanding retention to external backup/export lifecycle rules.

## Decisions

1. Archive means soft-delete only.
- Rationale: preserves historical integrity and aligns with existing `archived_at` model.
- Alternative: hard-delete behavior. Rejected due to auditability and data-loss risk.

2. List endpoints default to active-only results.
- Rationale: matches expected UX for primary ledgers and avoids accidental archived noise.
- Alternative: default include archived. Rejected due to broader breakage risk.

3. `include_archived=true` is the only opt-in for archived rows in lists.
- Rationale: single, predictable toggle across domain endpoints.
- Alternative: endpoint-specific toggles. Rejected due to inconsistency.

4. Analytics excludes archived transactions by policy.
- Rationale: archived transactions represent inactive records and should not skew current reporting.
- Alternative: include archived in analytics. Rejected due to policy ambiguity and unexpected totals.

## Risks / Trade-offs

- [Legacy clients assuming mixed archived visibility] -> Mitigation: explicit OpenAPI docs + integration tests.
- [Analytics behavior surprises for historical comparisons] -> Mitigation: policy documented as explicit exclusion of archived transactions.
- [Cross-endpoint drift over time] -> Mitigation: matrix-style integration tests for toggle behavior.

## Migration Plan

1. Update OpenAPI descriptions for archive and list semantics.
2. Align runtime list and analytics behaviors to the selected policy.
3. Add integration tests for include_archived toggles and analytics archive treatment.
4. Mirror OpenAPI updates to `openspec/specs/openapi.yaml`.
5. Run full suite and coverage gate.

Rollback:
- Revert behavior alignment and OpenAPI wording updates if regressions are detected.

## Open Questions

- Should analytics gain an explicit future query toggle for archived data (for audit-style reporting), or remain fixed-policy only?
