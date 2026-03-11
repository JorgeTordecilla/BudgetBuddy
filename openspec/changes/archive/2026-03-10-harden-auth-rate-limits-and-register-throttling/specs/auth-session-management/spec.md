## MODIFIED Requirements

### Requirement: User registration
The backend MUST implement `POST /auth/register` with schema validation, user creation, auth-session response semantics, and throttling behavior consistent with auth abuse protection policy.

#### Scenario: Register success
- **WHEN** a valid unique username, password, and currency code are submitted within configured limits
- **THEN** the API SHALL return `201` vendor JSON with `user`, `access_token`, and `access_token_expires_in`
- **AND** it SHALL set the refresh cookie without exposing refresh token material in JSON

#### Scenario: Register over threshold returns canonical throttle response
- **WHEN** a client exceeds configured register limits within the active rate-limit window
- **THEN** `POST /auth/register` SHALL return canonical `429` ProblemDetails
- **AND** the response SHALL include `Retry-After`
- **AND** normal registration persistence SHALL NOT execute

### Requirement: Registration change is additive to existing auth behavior
Adding throttling to register MUST NOT alter login, refresh, or logout runtime semantics.

#### Scenario: Existing auth lifecycle remains behaviorally unchanged
- **WHEN** login, refresh, and logout flows execute after register throttling is introduced
- **THEN** statuses, payloads, cookie behavior, and auth-session semantics for those endpoints SHALL remain unchanged

### Requirement: Refresh flow behavior under throttling
The refresh flow MUST preserve replay-protection semantics under threshold and deterministic throttling over threshold.

#### Scenario: Refresh throttling cannot be bypassed by token variation
- **WHEN** a client submits repeated refresh requests from the same effective client IP using different arbitrary refresh token values
- **THEN** throttling enforcement SHALL still apply to that client identity
- **AND** arbitrary token variation SHALL NOT create independent limiter buckets

#### Scenario: Refresh under threshold preserves rotation behavior
- **WHEN** a valid refresh request is within configured limits
- **THEN** `POST /auth/refresh` SHALL continue normal token rotation and replay-protection behavior
