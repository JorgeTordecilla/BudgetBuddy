## 1. Policy audit baseline

- [x] 1.1 Build a frontend policy checklist from `PROJECT.md` and `openspec/config.yaml`.
- [x] 1.2 Produce `frontend/docs/policy-compliance/hu-fe-04-report.md` with pass/fail status for each policy item.
- [x] 1.3 Attach evidence references (`file:line`) for every checklist row.

## 2. Remediation planning

- [x] 2.1 Create remediation tasks for every failed checklist row.
- [x] 2.2 Prioritize remediation by contract risk and user impact.
- [x] 2.3 Mark explicitly any deferred item with reason and follow-up recommendation.

## 3. Frontend refactor execution

- [x] 3.1 Refactor architecture and component boundaries where policy fails.
- [x] 3.2 Refactor error handling to preserve canonical ProblemDetails UX where policy fails.
- [x] 3.3 Refactor UI state handling (loading/empty/success/error) where policy fails.
- [x] 3.4 Refactor accessibility/responsive behavior where policy fails.

## 4. Tests and quality gates

- [x] 4.1 Add or adjust unit/integration tests for each remediated policy gap.
- [x] 4.2 Update smoke checks for impacted flows.
- [x] 4.3 Run `npm run test` in `frontend/`.
- [x] 4.4 Run `npm run test:coverage` in `frontend/`.
- [x] 4.5 Run `npm run build` in `frontend/`.
- [x] 4.6 Verify coverage >= 85% global and >= 90% for critical frontend flows.

## 5. Final verification

- [x] 5.1 Update compliance report to show all closed findings with evidence.
- [x] 5.2 Run OpenSpec verify for this change and resolve warnings.
- [x] 5.3 Confirm change is archive-ready with no unresolved failed policy checks.
