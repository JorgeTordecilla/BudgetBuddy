## MODIFIED Requirements

### Requirement: Frontend runtime configuration must be environment-driven
The frontend SHALL derive runtime API targets and deployment metadata from explicit `VITE_*` variables, not hardcoded host values.

#### Scenario: API base URL comes from environment contract
- **WHEN** frontend initializes API client configuration
- **THEN** it SHALL use `VITE_API_BASE_URL` as the authoritative backend base URL
- **AND** feature code SHALL NOT hardcode `http://localhost:8000/api`.

#### Scenario: Runtime env access is centralized
- **WHEN** frontend reads environment variables
- **THEN** it SHALL do so through a single typed module (e.g., `src/config/env.ts`)
- **AND** direct `import.meta.env` access in feature modules SHALL be avoided.

#### Scenario: Environment template is documented
- **WHEN** a developer or CI configures the frontend project
- **THEN** `.env.example` SHALL include `VITE_API_BASE_URL`, `VITE_APP_ENV`, `VITE_RELEASE`, and optional feature flags/telemetry keys
- **AND** each variable SHALL include intended values for local and production usage.

#### Scenario: Release identity is propagated to runtime telemetry context
- **WHEN** frontend starts in non-local environment
- **THEN** `VITE_RELEASE` SHALL be available to observability integrations
- **AND** emitted frontend error events SHALL include release and environment metadata.
