## Purpose

Define minimum observability guarantees for request correlation and environment-safe error logging.

## Requirements

### Requirement: Request logs are structured and correlatable
The service SHALL emit one structured access log entry per request with stable correlation fields.

#### Scenario: Access log includes required request metadata
- **WHEN** any API request is processed
- **THEN** logs SHALL include `request_id`, `method`, `path`, `status_code`, and `duration_ms`

#### Scenario: Access log includes authenticated user identifier only
- **WHEN** request is authenticated
- **THEN** access logs SHALL include `user_id`
- **AND** logs SHALL NOT include additional user PII

#### Scenario: Correlation id is always present in log record
- **WHEN** request logging occurs
- **THEN** the access log entry SHALL always contain a non-empty `request_id`

### Requirement: Error logging follows environment-safe stacktrace policy
Unhandled server errors SHALL be logged with environment-appropriate verbosity.

#### Scenario: Non-production includes stacktrace for unhandled 5xx
- **WHEN** environment is non-production and an unhandled server error occurs
- **THEN** logs SHALL include stacktrace information for debugging

#### Scenario: Production restricts stacktrace leakage
- **WHEN** environment is production and an unhandled server error occurs
- **THEN** logs SHALL avoid verbose stacktrace content by default
- **AND** logs SHALL still include structured error metadata and correlation fields

### Requirement: Log level is runtime-configurable
Logging verbosity SHALL be configurable through environment settings.

#### Scenario: Log level can be controlled by env var
- **WHEN** operators set configured log-level environment variable
- **THEN** runtime logging level SHALL follow that configuration
