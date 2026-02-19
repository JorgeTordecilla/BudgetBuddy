## ADDED Requirements

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
