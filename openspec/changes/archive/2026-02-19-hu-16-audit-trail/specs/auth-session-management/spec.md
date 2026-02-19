## ADDED Requirements

### Requirement: Auth session security events are auditable
Authentication lifecycle flows MUST emit audit events for logout and refresh-token reuse detection.

#### Scenario: Logout emits audit event
- **WHEN** `POST /auth/logout` succeeds for an authenticated user
- **THEN** the system SHALL persist an audit event linked to `request_id`, `user_id`, and logout action

#### Scenario: Refresh token reuse emits security audit event
- **WHEN** refresh-token reuse is detected in `POST /auth/refresh`
- **THEN** the system SHALL persist an audit event representing the security action without storing token secrets

### Requirement: Auth audit emission does not change session contract semantics
Adding audit writes MUST NOT change existing auth endpoint functional outcomes.

#### Scenario: Auth responses remain contract-compatible with audit enabled
- **WHEN** register/login/refresh/logout are executed under normal conditions
- **THEN** status codes, response schemas, and media types SHALL remain unchanged
