## Why

Recent frontend changes introduced stronger engineering policies, but compliance has not been formalized as a contract-driven workflow.  
Without an explicit policy-audit change, we risk drift in architecture consistency, UX quality, accessibility, and test/coverage gates.

## What Changes

- Define a policy-compliance capability for frontend changes.
- Audit the current frontend implementation against mandatory policy points.
- Require refactor work for every failed policy check in the same change scope.
- Produce a traceable compliance report with evidence links.
- Enforce verification commands and coverage thresholds before archive.

## Capabilities

### New Capabilities
- `frontend-policy-compliance-governance`: policy audit and remediation contract for frontend engineering quality.

### Modified Capabilities
- None.

## Impact

- Affected code: frontend architecture and UI modules that fail policy checks.
- Affected docs/specs: new frontend governance spec and compliance report artifact.
- Quality gates: `npm run test`, `npm run test:coverage`, `npm run build`, and policy threshold checks.
- Backwards compatibility: no backend contract changes.
