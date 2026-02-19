## Context

BudgetBuddy already follows a contract-first workflow with `backend/openapi.yaml` as the source of truth and `openspec/specs/openapi.yaml` as the mirrored spec artifact. HU-17 extends contract quality and developer experience by making examples first-class and by generating SDK clients from the same contract in a repeatable pipeline.

## Goals / Non-Goals

**Goals:**
- Add exhaustive endpoint examples in OpenAPI with minimum one success and one error example per operation.
- Publish canonical ProblemDetails examples for `400/401/403/406/409/429`.
- Generate deterministic TypeScript and Python SDKs from OpenAPI.
- Add CI checks for OpenAPI validity and SDK drift.
- Document local commands and pinned generator versions.

**Non-Goals:**
- Changing business logic or endpoint status-code behavior.
- Introducing runtime SDK serving endpoints.
- Replacing existing test suites with SDK-only checks.

## Decisions

1. Use one OpenAPI source (`backend/openapi.yaml`) and treat generated SDKs as derived artifacts.
- Rationale: keeps a single contract source while allowing clients to stay in sync.
- Alternative considered: maintain manual SDK wrappers only. Rejected due to drift and maintenance cost.

2. Pin generator versions and configuration files in-repo.
- Rationale: reproducible outputs across CI and developer machines.
- Alternative considered: floating latest generator release. Rejected due to non-deterministic output churn.

3. Implement CI drift check by regenerating SDKs and failing on diff.
- Rationale: simple and deterministic protection against stale generated code.
- Alternative considered: periodic manual regeneration. Rejected due to weak enforcement.

4. Reuse canonical ProblemDetails catalog entries for examples.
- Rationale: preserves contract-first consistency and avoids contradictory error examples.
- Alternative considered: per-endpoint ad hoc error examples. Rejected due to inconsistency risk.

5. Preserve media-type policy in examples.
- Rationale: examples should reinforce current contract (`application/vnd.budgetbuddy.v1+json` success, `application/problem+json` errors).
- Alternative considered: generic `application/json` examples. Rejected as contract-inaccurate.

## Risks / Trade-offs

- [Generator output churn across OS/tooling] -> Mitigation: pin versions, pin config, run generation in CI using fixed environment.
- [Large generated diffs increase review noise] -> Mitigation: isolate generated SDK directories and document expected regeneration flow.
- [Examples drift from schemas over time] -> Mitigation: include OpenAPI validation in CI and keep examples near referenced schemas.
- [CI runtime increase] -> Mitigation: keep generation steps scoped and reuse cached dependencies when possible.

## Migration Plan

1. Add OpenAPI examples and canonical ProblemDetails examples.
2. Add generator configs and scripts; generate TS/Python SDKs.
3. Add CI jobs for OpenAPI validation and SDK drift checks.
4. Update contributor docs with local commands.
5. Run full backend tests and coverage gate to confirm no regressions.

Rollback:
- Revert SDK tooling/config and generated folders while retaining contract changes if needed.
- Revert OpenAPI example additions if validation uncovers blocking issues.

## Open Questions

- Should SDK artifacts be published as packages in a later change, or remain repository-only for now?
- Should CSV export endpoints include language-specific helper abstractions in generated clients or stay raw HTTP?
