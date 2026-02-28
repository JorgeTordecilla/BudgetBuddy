# frontend-deploy-routing Specification

## Purpose
TBD - created by archiving change hu-fe-14-netlify-prod-readiness. Update Purpose after archive.
## Requirements
### Requirement: Netlify deploy must support SPA deep-link routing
Frontend deploy configuration SHALL guarantee browser refresh support for app routes handled by React Router and SHALL define deterministic build/publish settings for Netlify.

#### Scenario: Netlify build and publish contract is explicit
- **WHEN** production deploy configuration is reviewed
- **THEN** it SHALL define build command and publish directory for the SPA artifact
- **AND** these values SHALL be versioned in repository configuration.

#### Scenario: Deep-link refresh does not 404
- **WHEN** a user refreshes a deep route such as `/app/dashboard` or `/app/transactions`
- **THEN** Netlify SHALL rewrite the request to `index.html`
- **AND** client-side routing SHALL resolve the intended route.

#### Scenario: Redirect rule is explicitly versioned
- **WHEN** frontend deploy config is reviewed
- **THEN** repository SHALL include `_redirects` or `netlify.toml` with SPA fallback semantics
- **AND** the fallback rule SHALL be deterministic (`/* /index.html 200` or equivalent).

#### Scenario: API proxy redirect is explicit and versioned
- **WHEN** frontend deploy config is reviewed
- **THEN** Netlify SHALL include a redirect for `/api/*` to the backend service `/api/:splat`
- **AND** the redirect SHALL return `200` with `force=true` semantics.

#### Scenario: API proxy rule takes precedence over SPA fallback
- **WHEN** Netlify evaluates redirects
- **THEN** `/api/*` proxy SHALL be resolved before catch-all SPA rewrite rules
- **AND** API requests SHALL NOT be rewritten to `index.html`.

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
