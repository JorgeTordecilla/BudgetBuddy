## MODIFIED Requirements

### Requirement: Auth rate limits are configurable per endpoint
The backend MUST allow independent rate-limit configuration for auth login and auth refresh endpoints.

#### Scenario: Login and refresh limits are independently configurable
- **WHEN** operators set endpoint-specific auth rate-limit env values
- **THEN** runtime SHALL enforce distinct thresholds for `POST /auth/login` and `POST /auth/refresh`

#### Scenario: Auth throttling returns canonical retry contract
- **WHEN** auth rate limit is exceeded
- **THEN** response SHALL be canonical `429` ProblemDetails and SHALL include `Retry-After`
