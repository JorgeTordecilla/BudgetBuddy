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

