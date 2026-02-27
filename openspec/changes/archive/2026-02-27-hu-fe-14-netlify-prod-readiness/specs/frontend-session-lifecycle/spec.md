## ADDED Requirements

### Requirement: Session lifecycle, refresh retry, and route-guard behavior must be deterministic
Frontend production session behavior MUST remain predictable under cross-site cookie constraints, with explicit operator-facing guidance for configuration and security boundaries.

#### Scenario: Production auth requirements are documented for cross-site cookie sessions
- **WHEN** frontend production deployment is configured
- **THEN** frontend documentation SHALL list required backend conditions:
  - CORS origin allowlist includes frontend deploy domain
  - `Access-Control-Allow-Credentials: true`
  - refresh cookie flags include `HttpOnly`, `Secure`, and `SameSite=None`
- **AND** documentation SHALL include troubleshooting guidance for session restoration failures.

#### Scenario: CSRF risk is explicitly tracked as follow-up
- **WHEN** cross-site refresh-cookie model is documented
- **THEN** frontend documentation SHALL explicitly mark CSRF strategy as a follow-up security decision
- **AND** SHALL avoid implying CSRF is already solved by this change.
