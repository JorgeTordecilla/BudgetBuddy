## Purpose

Define mandatory frontend governance checks so every frontend OpenSpec change is auditable, remediated, and quality-gated before archive.

## Requirements

### Requirement: Frontend policy compliance audit is mandatory
Every frontend governance change MUST include an explicit compliance audit against project policy statements.

#### Scenario: Compliance report is generated with deterministic structure
- **WHEN** the audit is executed for this change
- **THEN** the repository SHALL contain `frontend/docs/policy-compliance/hu-fe-04-report.md`
- **AND** each policy row SHALL include `status`, `evidence`, and `remediation` fields

#### Scenario: Policy rows are traceable to source policy
- **WHEN** a policy item is listed in the report
- **THEN** it SHALL reference the originating policy source (`PROJECT.md` and/or `openspec/config.yaml`)

### Requirement: Failed policy checks require remediation before archive
Any failed frontend policy check MUST be refactored or explicitly deferred with rationale before archive readiness.

#### Scenario: Failed checks map to concrete refactor tasks
- **WHEN** a compliance row has `status=fail`
- **THEN** at least one remediation task SHALL exist in `tasks.md`
- **AND** the remediation result SHALL update the same row with closure evidence

#### Scenario: Deferred failures are explicitly documented
- **WHEN** a failed policy check cannot be fixed in this change
- **THEN** the report SHALL document a defer reason and a follow-up recommendation
- **AND** archive readiness SHALL clearly state unresolved deferred items

### Requirement: Frontend policy dimensions are verified with scenarios
Compliance audit MUST evaluate architecture, error semantics, UX state behavior, accessibility, and responsiveness.

#### Scenario: Canonical ProblemDetails UX policy is verified
- **WHEN** the audit evaluates API error behavior
- **THEN** it SHALL verify deterministic handling for canonical `401`, `403`, `406`, and `409`
- **AND** findings SHALL reference concrete UI or client code paths

#### Scenario: UX state policy is verified
- **WHEN** the audit evaluates screens under scope
- **THEN** it SHALL verify loading, empty, success, and error state behavior with test evidence

#### Scenario: Accessibility and responsive policy is verified
- **WHEN** the audit evaluates UI behavior
- **THEN** it SHALL include checks for keyboard-accessible interactions and responsive behavior across desktop/mobile states

### Requirement: Verification gates enforce compliance quality
Frontend governance changes MUST pass quality gates and document command evidence.

#### Scenario: Required frontend verification commands are executed
- **WHEN** the change is prepared for verification
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL be executed in `frontend/`

#### Scenario: Coverage thresholds satisfy policy
- **WHEN** coverage is reported for frontend
- **THEN** global coverage SHALL be `>= 85%`
- **AND** critical frontend flow coverage SHALL be `>= 90%`
