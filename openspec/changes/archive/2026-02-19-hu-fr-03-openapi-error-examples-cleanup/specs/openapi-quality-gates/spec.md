## ADDED Requirements

### Requirement: CI validates ProblemDetails example-to-catalog consistency
Continuous integration MUST validate that documented `application/problem+json` examples map to canonical ProblemDetails identities consistent with each response purpose.

#### Scenario: Mismatched problem example fails CI
- **WHEN** an endpoint response maps an example whose canonical identity does not match the declared error semantics for that endpoint/status
- **THEN** CI SHALL fail with a deterministic contract-quality error

#### Scenario: Canonical problem example mapping passes CI
- **WHEN** endpoint response examples align with canonical catalog identities and response intent
- **THEN** CI SHALL pass the ProblemDetails example consistency gate

### Requirement: CI guards reusable example references
Continuous integration MUST validate that reusable ProblemDetails examples referenced by operations exist and resolve correctly.

#### Scenario: Broken reusable example reference fails CI
- **WHEN** a response references a missing or invalid ProblemDetails example component
- **THEN** CI SHALL fail with a deterministic validation error

#### Scenario: Valid reusable example references pass CI
- **WHEN** response example references resolve to existing canonical components
- **THEN** CI SHALL pass reusable example integrity checks
