# frontend-e2e-smoke Specification

## Purpose
TBD - created by archiving change hu-fe-14-netlify-prod-readiness. Update Purpose after archive.
## Requirements
### Requirement: Frontend deploy must provide baseline smoke coverage
The frontend repository SHALL provide Playwright smoke tests that validate login and authenticated bootstrap/navigation against a configured target environment.

#### Scenario: Login page smoke passes
- **WHEN** smoke suite runs against `E2E_BASE_URL`
- **THEN** it SHALL load `/login`
- **AND** verify expected baseline login UI elements are present.

#### Scenario: Authenticated dashboard navigation smoke passes
- **WHEN** smoke suite logs in with configured test credentials
- **THEN** it SHALL reach an authenticated route (`/app/dashboard`)
- **AND** verify baseline authenticated content is rendered.

#### Scenario: E2E environment contract is explicit
- **WHEN** Playwright suite is configured for CI or local runs
- **THEN** required variables SHALL include `E2E_BASE_URL`, `E2E_USERNAME`, and `E2E_PASSWORD`
- **AND** project scripts SHALL expose a deterministic e2e command (e.g., `npm run test:e2e`).

