## MODIFIED Requirements

### Requirement: Auth endpoint rate limiting
The backend MUST enforce deterministic rate limits for `POST /auth/register`, `POST /auth/login`, and `POST /auth/refresh`.

#### Scenario: Register requests are throttled at configured threshold
- **WHEN** a client exceeds the configured register threshold within the active rate-limit window
- **THEN** the API SHALL reject further register attempts with canonical `429` ProblemDetails until the window allows retry
- **AND** the response SHALL include `Retry-After`

#### Scenario: Login requests are throttled at configured threshold
- **WHEN** a client exceeds the configured login threshold within the active rate-limit window
- **THEN** the API SHALL reject further login attempts with canonical `429` ProblemDetails until the window allows retry

#### Scenario: Refresh requests are throttled at configured threshold
- **WHEN** a client exceeds the configured refresh threshold within the active rate-limit window
- **THEN** the API SHALL reject further refresh attempts with canonical `429` ProblemDetails until the window allows retry

#### Scenario: Refresh throttling identity is derived from client IP
- **WHEN** `POST /auth/refresh` applies rate-limit identity
- **THEN** runtime SHALL derive that identity from trusted client IP resolution only
- **AND** arbitrary refresh token value variation SHALL NOT create independent limiter buckets

### Requirement: Auth rate limits are configurable per endpoint
The backend MUST allow independent rate-limit configuration for auth register, auth login, and auth refresh endpoints.

#### Scenario: Register, login, and refresh limits are independently configurable
- **WHEN** operators set endpoint-specific auth rate-limit env values
- **THEN** runtime SHALL enforce distinct thresholds for `POST /auth/register`, `POST /auth/login`, and `POST /auth/refresh`

#### Scenario: Auth throttling returns canonical retry contract
- **WHEN** auth rate limit is exceeded
- **THEN** response SHALL be canonical `429` ProblemDetails and SHALL include `Retry-After`

### Requirement: Trusted proxy policy for limiter identity
The backend MUST apply an explicit trusted-proxy policy before using forwarded client IP headers for rate-limiting identity on auth endpoints.

#### Scenario: Trusted proxy allows forwarded client identity
- **WHEN** a request is received from a configured trusted proxy and includes a valid forwarded client chain
- **THEN** auth limiter identity SHALL use the effective forwarded client IP according to the trusted-proxy policy

#### Scenario: Missing trusted proxy configuration uses safe default
- **WHEN** no trusted proxy is configured
- **THEN** auth limiter identity SHALL default to direct peer connection identity

### Requirement: In-memory limiter state remains bounded over time
The in-memory auth limiter MUST periodically evict expired inactive buckets so long-lived processes do not accumulate unbounded limiter state.

#### Scenario: Expired unlocked buckets are evicted during passive cleanup
- **WHEN** a bucket window has expired and the bucket is not actively locked
- **THEN** passive cleanup SHALL remove that bucket from in-memory state

#### Scenario: Active lock buckets are retained until lock expiry
- **WHEN** a bucket is still within `lock_until`
- **THEN** passive cleanup SHALL NOT evict it before the lock expires
