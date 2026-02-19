## Purpose

Define deterministic and reproducible SDK generation from the OpenAPI contract.

## ADDED Requirements

### Requirement: SDK generation is deterministic and reproducible
The project MUST generate TypeScript and Python SDKs from `backend/openapi.yaml` using pinned generator versions and checked-in configuration.

#### Scenario: Pinned generator inputs are versioned
- **WHEN** SDK generation tooling is reviewed
- **THEN** config files and generator version pins SHALL be committed so generation is reproducible across environments

#### Scenario: TypeScript and Python SDK outputs are generated from the same spec
- **WHEN** SDK generation command runs
- **THEN** `sdk/typescript` and `sdk/python` SHALL be regenerated from the same OpenAPI source without manual edits

### Requirement: SDK generation commands are documented for contributors
The project MUST document local commands and prerequisites for SDK regeneration.

#### Scenario: Developer can regenerate SDKs locally
- **WHEN** a contributor follows documented commands
- **THEN** they SHALL be able to regenerate both SDKs and produce identical output format expected by CI
