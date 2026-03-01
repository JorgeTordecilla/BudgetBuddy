# frontend-runtime-configuration Specification

## Purpose
TBD - created by archiving change hu-fe-14-netlify-prod-readiness. Update Purpose after archive.
## Requirements
### Requirement: Frontend runtime configuration must be environment-driven
The frontend deployment runtime SHALL rely on explicit environment values for API routing and proxy target generation.

#### Scenario: Netlify proxy target is supplied by environment
- **WHEN** frontend deploy runs in Netlify
- **THEN** `API_PROXY_TARGET` SHALL be provided as environment configuration
- **AND** generated redirect rules SHALL use this value as backend base.

#### Scenario: Frontend API base remains same-origin
- **WHEN** frontend runtime initializes API calls
- **THEN** `VITE_API_BASE_URL` SHALL remain `/api`
- **AND** components SHALL not hardcode backend host URLs.

#### Scenario: Vite development proxy target is environment-resolved
- **WHEN** frontend runs in Vite development mode with local `/api` proxy enabled
- **THEN** proxy target SHALL resolve from `VITE_DEV_API_TARGET` when provided
- **AND** SHALL fallback to `http://localhost:8000` when the variable is absent.

