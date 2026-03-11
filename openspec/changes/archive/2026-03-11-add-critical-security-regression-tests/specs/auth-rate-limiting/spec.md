## MODIFIED Requirements

### Requirement: Auth endpoint rate limiting
The backend MUST enforce deterministic rate limits for `POST /auth/login` and `POST /auth/refresh`.

#### Scenario: Login requests are throttled at configured threshold
- **WHEN** a client exceeds the configured login threshold within the active rate-limit window
- **THEN** the API SHALL reject further login attempts with canonical `429` ProblemDetails until the window allows retry
- **AND** automated backend regression coverage SHALL verify that blocking begins immediately after the configured Nth failed attempt sequence used by the limiter policy
