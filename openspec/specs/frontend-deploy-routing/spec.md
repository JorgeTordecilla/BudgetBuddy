# frontend-deploy-routing Specification

## Purpose
TBD - created by archiving change hu-fe-14-netlify-prod-readiness. Update Purpose after archive.
## Requirements
### Requirement: Netlify deploy must support SPA deep-link routing
Frontend deploy configuration SHALL provide deterministic API proxy and SPA fallback routing for production deployments.

#### Scenario: Build emits redirect manifest from environment
- **WHEN** Netlify executes frontend build
- **THEN** build command SHALL generate `dist/_redirects` containing `/api/* $API_PROXY_TARGET/:splat 200`
- **AND** it SHALL include SPA fallback `/* /index.html 200`.

#### Scenario: Requested redirect blocks remain present in config
- **WHEN** `frontend/netlify.toml` is reviewed
- **THEN** it SHALL include explicit `[[redirects]]` entries for `/api/*` and `/*`
- **AND** `/api/*` redirect SHALL be marked `force = true`.

### Requirement: Netlify response security headers must be baseline-hardened
Frontend hosting configuration SHALL enforce baseline browser security headers for production responses.

#### Scenario: Security headers are configured at hosting edge
- **WHEN** Netlify serves frontend assets
- **THEN** response headers SHALL include at minimum `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`
- **AND** headers SHALL be defined in version-controlled deploy configuration.

#### Scenario: CSP baseline is enabled and validated
- **WHEN** production deployment is promoted
- **THEN** a conservative `Content-Security-Policy` SHALL be active
- **AND** verification SHALL confirm it does not break core login/navigation flows.

