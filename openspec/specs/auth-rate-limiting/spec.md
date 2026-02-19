## Purpose

TBD: Define auth-rate-limiting capability behavior.

## ADDED Requirements

### Requirement: Auth endpoint rate limiting
The backend MUST enforce deterministic rate limits for `POST /auth/login` and `POST /auth/refresh`.

#### Scenario: Login requests are throttled at configured threshold
- **WHEN** a client exceeds the configured login threshold within the active rate-limit window
- **THEN** the API SHALL reject further login attempts with canonical `429` ProblemDetails until the window allows retry

#### Scenario: Refresh requests are throttled at configured threshold
- **WHEN** a client exceeds the configured refresh threshold within the active rate-limit window
- **THEN** the API SHALL reject further refresh attempts with canonical `429` ProblemDetails until the window allows retry

### Requirement: Endpoint-specific and configurable limits
Rate-limit thresholds and windows MUST be configurable per auth endpoint.

#### Scenario: Login and refresh limits are independently configurable
- **WHEN** service configuration defines different thresholds for login and refresh
- **THEN** runtime enforcement SHALL apply each endpoint policy independently without cross-endpoint bucket coupling

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

