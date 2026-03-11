## MODIFIED Requirements

### Requirement: Audit events are persisted for mutation actions
The backend MUST persist an audit event whenever a tracked mutation or security action completes.

#### Scenario: Auth security actions emit audit events
- **WHEN** `POST /auth/logout` succeeds or refresh-token reuse is detected in `POST /auth/refresh`
- **THEN** the system SHALL persist an audit event with the corresponding auth/security action
- **AND** automated backend regression coverage SHALL verify that refresh-token reuse persists `auth.refresh_token_reuse_detected` in owner-visible audit history
