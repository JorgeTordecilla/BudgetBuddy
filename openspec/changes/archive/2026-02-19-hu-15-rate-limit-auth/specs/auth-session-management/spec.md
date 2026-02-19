## ADDED Requirements

### Requirement: Login flow behavior under throttling
The login flow MUST preserve existing credential validation semantics under threshold and return deterministic throttling behavior over threshold.

#### Scenario: Login under threshold remains unchanged
- **WHEN** a client submits valid login requests within configured limits
- **THEN** `POST /auth/login` SHALL behave identically to current auth-session behavior and return standard success/error outcomes

#### Scenario: Login over threshold returns canonical throttle response
- **WHEN** a client exceeds configured login limits within the active window
- **THEN** `POST /auth/login` SHALL return canonical `429` ProblemDetails and SHALL NOT execute normal credential processing path

### Requirement: Refresh flow behavior under throttling
The refresh flow MUST preserve token-rotation semantics under threshold and deterministic throttling over threshold.

#### Scenario: Refresh under threshold preserves rotation behavior
- **WHEN** a valid refresh token request is within configured limits
- **THEN** `POST /auth/refresh` SHALL continue normal token rotation and replay-protection behavior

#### Scenario: Refresh over threshold is throttled before refresh logic
- **WHEN** a client exceeds configured refresh limits within the active window
- **THEN** `POST /auth/refresh` SHALL return canonical `429` ProblemDetails and SHALL NOT advance refresh-token state

### Requirement: Rate limiting is deterministic for testability
Auth throttling behavior MUST support deterministic verification in integration tests.

#### Scenario: Configurable thresholds support deterministic tests
- **WHEN** tests configure low thresholds or controlled windows
- **THEN** throttling outcomes SHALL be deterministic and reproducible without timing flakiness
