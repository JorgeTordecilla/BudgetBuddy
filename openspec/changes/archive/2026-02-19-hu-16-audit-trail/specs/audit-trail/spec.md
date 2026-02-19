## ADDED Requirements

### Requirement: Audit events are persisted for mutation actions
The backend MUST persist an audit event whenever a tracked mutation or security action completes.

#### Scenario: Domain mutations emit audit events
- **WHEN** accounts, categories, or transactions perform create, update, archive, or restore operations
- **THEN** the system SHALL persist one audit event per successful action

#### Scenario: Auth security actions emit audit events
- **WHEN** `POST /auth/logout` succeeds or refresh-token reuse is detected in `POST /auth/refresh`
- **THEN** the system SHALL persist an audit event with the corresponding auth/security action

### Requirement: Audit event envelope is normalized and traceable
Each audit event MUST store normalized identity and trace fields for deterministic investigation.

#### Scenario: Event stores canonical core fields
- **WHEN** an audit event is written
- **THEN** it SHALL include `request_id`, `user_id`, `resource_type`, `resource_id`, `action`, and `created_at`

#### Scenario: User timeline queries are index-efficient
- **WHEN** audit events are queried by owner and time order
- **THEN** storage SHALL support indexed lookup on `(user_id, created_at)`

### Requirement: Audit storage excludes sensitive secrets
Audit persistence MUST never store raw tokens, credentials, or secret-like values.

#### Scenario: Token-like values are redacted or omitted
- **WHEN** auth-related events are recorded
- **THEN** refresh tokens, bearer tokens, password material, and secret-like values SHALL NOT be persisted

#### Scenario: Security details remain diagnostically useful but safe
- **WHEN** a security event such as token reuse is recorded
- **THEN** the event SHALL preserve actionable context (actor/action/time/resource) without exposing sensitive artifacts

### Requirement: Owner-scoped audit query API
The API MUST provide owner-only audit listing with deterministic cursor pagination.

#### Scenario: Owner reads own audit timeline
- **WHEN** an authenticated user calls `GET /audit` with optional `from`, `to`, `cursor`, and `limit`
- **THEN** the API SHALL return only that user events ordered deterministically with `{ items, next_cursor }`

#### Scenario: Invalid audit query parameters return canonical errors
- **WHEN** `GET /audit` receives an invalid cursor or invalid date range
- **THEN** the API SHALL return canonical `400` `application/problem+json` responses
