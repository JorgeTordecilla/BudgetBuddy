## Context

Project-wide policy already defines mandatory frontend standards (enterprise-grade architecture, canonical error UX, accessibility/responsive behavior, and quality gates).  
This change formalizes a repeatable audit + remediation model so policy compliance is verifiable and not left to ad-hoc review.

## Goals / Non-Goals

**Goals:**
- Convert policy statements into explicit, testable requirements.
- Produce a compliance matrix with pass/fail status and evidence.
- Refactor all non-compliant areas within this change before archive.
- Keep verification deterministic using explicit commands and thresholds.

**Non-Goals:**
- Introducing new product features unrelated to compliance gaps.
- Changing backend contracts.
- Replacing current design system or state strategy unless required to meet policy.

## Decisions

1. Compliance report is mandatory and versioned in repository
- Decision: add `frontend/docs/policy-compliance/hu-fe-04-report.md` as audit output.
- Rationale: creates traceability between policy checks and actual remediation work.

2. Refactor policy is strict for failed checks
- Decision: any failed check must map to at least one remediation task and evidence update.
- Rationale: avoids “known debt accepted by default” behavior.

3. Coverage and build verification are hard gates
- Decision: enforce `npm run test`, `npm run test:coverage`, and `npm run build`.
- Rationale: prevents regressions while policy refactors are applied.

4. Critical-flow coverage threshold is tracked separately
- Decision: keep global frontend coverage >= 85% and critical flows >= 90%.
- Rationale: aligns with project frontend policy without weakening flow-level confidence.

## Audit Model

Policy dimensions to audit:
- Architecture boundaries (routing, data layer, API client ownership, component reuse)
- Error semantics (canonical ProblemDetails handling for 401/403/406/409)
- UX state model (loading/empty/success/error determinism)
- Accessibility (keyboard navigation, semantics, visible focus behavior where relevant)
- Responsive behavior (desktop/mobile functional integrity)
- Verification discipline (tests + coverage + build)

Each policy row must include:
- `status`: pass/fail
- `evidence`: file references
- `remediation`: required when fail
- `validation`: test or command proving closure

## Risks / Trade-offs

- [Risk] Scope expansion from too many policy findings -> Mitigation: prioritize by user impact and contract risk; keep out-of-scope items documented as follow-up.
- [Risk] Over-refactor for stylistic differences -> Mitigation: only enforce written policy clauses, not subjective preference.
- [Risk] False confidence from missing evidence -> Mitigation: require concrete file references and command outputs in report.

## Migration Plan

1. Build policy checklist from current project frontend policy.
2. Audit current frontend code and tests against checklist.
3. Create remediation tasks for each failed check.
4. Implement refactors and update report evidence.
5. Run verification commands and confirm coverage thresholds.

## Open Questions

- Should compliance report be required for every future frontend change, or only governance-tagged changes?
- Should we add CI automation for policy-report schema validation in a follow-up change?
