# frontend-runtime-configuration Specification

## Purpose
TBD - created by archiving change hu-fe-14-netlify-prod-readiness. Update Purpose after archive.
## Requirements
### Requirement: Frontend runtime configuration must be environment-driven
The frontend deployment runtime SHALL keep API routing same-origin and enforce least-privilege CSP/headers in Netlify delivery.

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

#### Scenario: Netlify CSP connect-src is strict same-origin
- **WHEN** Netlify serves frontend responses
- **THEN** CSP SHALL include `connect-src 'self'`
- **AND** it SHALL NOT include broad scheme-level allowlists like `https:` without explicit host constraints.

#### Scenario: Netlify CSP img-src is restricted to local/data origins
- **WHEN** Netlify serves frontend responses
- **THEN** CSP SHALL include `img-src 'self' data:`
- **AND** arbitrary external HTTPS image origins SHALL be blocked unless explicitly allowlisted.

#### Scenario: Same-origin API proxy remains CSP-compatible
- **WHEN** frontend issues API calls to `/api/*`
- **THEN** requests SHALL remain allowed under `connect-src 'self'`
- **AND** Netlify proxy routing behavior SHALL continue unchanged.

#### Scenario: Clickjacking headers provide layered protection
- **WHEN** response headers are evaluated by browser
- **THEN** `Content-Security-Policy` SHALL retain `frame-ancestors 'none'`
- **AND** `X-Frame-Options` SHALL be set to `DENY`.

#### Scenario: External integrations require explicit CSP allowlisting
- **WHEN** future features require external origins (for example Sentry ingestion)
- **THEN** exact hostnames SHALL be added to the relevant directive
- **AND** wildcard scheme entries (e.g., `https:`) SHALL not be used as generic fallback.

