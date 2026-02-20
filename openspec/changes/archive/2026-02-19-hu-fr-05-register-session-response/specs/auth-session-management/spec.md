## ADDED Requirements

### Requirement: Registration emits refresh cookie and session payload
Auth session management MUST treat registration as a session bootstrap flow equivalent to login.

#### Scenario: Register sets refresh cookie and returns access token payload
- **WHEN** `POST /auth/register` succeeds
- **THEN** the API SHALL persist refresh-token state server-side, set `bb_refresh` cookie, and return access-token session payload without exposing refresh token in JSON

### Requirement: Registration change is additive to existing auth behavior
Changing register payload shape MUST NOT alter login/refresh/logout runtime semantics.

#### Scenario: Existing auth lifecycle remains behaviorally unchanged
- **WHEN** login/refresh/logout flows execute after register-shape alignment
- **THEN** statuses, payloads, and cookie behavior for those endpoints SHALL remain unchanged
