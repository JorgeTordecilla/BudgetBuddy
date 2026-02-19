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

### Requirement: SDK interfaces reflect cookie-based refresh contract
Generated SDKs MUST reflect auth endpoint schemas after refresh-token body removal.

#### Scenario: Auth response models exclude refresh token for login and refresh
- **WHEN** SDKs are generated from updated OpenAPI
- **THEN** login and refresh success models SHALL omit `refresh_token` and expose only access-token fields and user payload

#### Scenario: Refresh operation does not require JSON body in generated clients
- **WHEN** SDKs are generated from updated OpenAPI
- **THEN** generated refresh API method SHALL not require a refresh-token request body parameter

### Requirement: Regeneration checks enforce no SDK drift after auth contract change
SDK consistency checks MUST fail if generated artifacts are not updated after auth cookie-transport changes.

#### Scenario: CI detects stale SDK outputs
- **WHEN** OpenAPI changes auth contract and SDK outputs are not regenerated
- **THEN** SDK drift/regen check SHALL fail deterministically
