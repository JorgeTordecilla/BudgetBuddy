# frontend-deploy-routing Specification

## Purpose
TBD - created by archiving change hu-fe-14-netlify-prod-readiness. Update Purpose after archive.
## Requirements
### Requirement: Netlify deploy must support SPA deep-link routing
Frontend deploy configuration SHALL guarantee browser refresh support for app routes handled by React Router.

#### Scenario: Deep-link refresh does not 404
- **WHEN** a user refreshes a deep route such as `/app/dashboard` or `/app/transactions`
- **THEN** Netlify SHALL rewrite the request to `index.html`
- **AND** client-side routing SHALL resolve the intended route.

#### Scenario: Redirect rule is explicitly versioned
- **WHEN** frontend deploy config is reviewed
- **THEN** repository SHALL include `_redirects` or `netlify.toml` with SPA fallback semantics
- **AND** the fallback rule SHALL be deterministic (`/* /index.html 200` or equivalent).

