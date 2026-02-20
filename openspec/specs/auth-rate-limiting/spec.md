## Purpose

TBD: Define auth-rate-limiting capability behavior.

## Requirements

### Requirement: Auth endpoint rate limiting
The backend MUST enforce deterministic rate limits for `POST /auth/login` and `POST /auth/refresh`.

#### Scenario: Login requests are throttled at configured threshold
- **WHEN** a client exceeds the configured login threshold within the active rate-limit window
- **THEN** the API SHALL reject further login attempts with canonical `429` ProblemDetails until the window allows retry

#### Scenario: Refresh requests are throttled at configured threshold
- **WHEN** a client exceeds the configured refresh threshold within the active rate-limit window
- **THEN** the API SHALL reject further refresh attempts with canonical `429` ProblemDetails until the window allows retry

### Requirement: Auth rate limits are configurable per endpoint
The backend MUST allow independent rate-limit configuration for auth login and auth refresh endpoints.

#### Scenario: Login and refresh limits are independently configurable
- **WHEN** operators set endpoint-specific auth rate-limit env values
- **THEN** runtime SHALL enforce distinct thresholds for `POST /auth/login` and `POST /auth/refresh`

#### Scenario: Auth throttling returns canonical retry contract
- **WHEN** auth rate limit is exceeded
- **THEN** response SHALL be canonical `429` ProblemDetails and SHALL include `Retry-After`

#### Scenario: Limits can be tuned without contract change
- **WHEN** operators adjust configured thresholds/windows
- **THEN** auth endpoint payload schemas and success semantics SHALL remain contract-compatible

### Requirement: Optional temporary lock semantics
The rate-limiting capability MUST support temporary lock behavior keyed by username/IP strategy for brute-force resistance.

#### Scenario: Temporary lock key strategy is deterministic
- **WHEN** lock behavior is enabled for login attempts
- **THEN** lock keys SHALL be derived deterministically from configured identity fields (username/IP fallback policy)

#### Scenario: Lock interval expiration restores normal flow
- **WHEN** lock interval expires and requests are again under limit
- **THEN** login or refresh processing SHALL resume normal behavior

