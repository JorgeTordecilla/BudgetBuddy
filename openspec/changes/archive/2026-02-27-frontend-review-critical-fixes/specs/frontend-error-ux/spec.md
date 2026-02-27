## MODIFIED Requirements

### Requirement: Global Error / ProblemDetails UX + Request-Id
Frontend MUST provide a centralized, consistent error experience that preserves support diagnostics through ProblemDetails mapping and request correlation identifiers, while avoiding unnecessary operational data exposure in auth-facing UI.

#### Scenario: Root runtime failures are captured by ErrorBoundary
- **WHEN** a React runtime error escapes page-level handling
- **THEN** frontend SHALL render a global fallback screen
- **AND** fallback SHALL provide a recovery action (`Try again` or `Reload`).

#### Scenario: Diagnostic payload is copyable from global fallback
- **WHEN** global fallback is displayed
- **THEN** frontend SHALL expose a "Copy diagnostic info" action
- **AND** copied payload SHALL include only safe metadata (`request_id`, `problem_type`, `path`, `timestamp`).

#### Scenario: Last request id is persisted for diagnostics
- **WHEN** frontend receives API responses with `X-Request-Id`
- **THEN** frontend SHALL persist the latest value in diagnostics state
- **AND** error surfaces SHALL reuse that value when rendering support context.

#### Scenario: Rate-limit feedback includes retry guidance
- **WHEN** an API operation returns `429` with optional `Retry-After`
- **THEN** frontend SHALL display a deterministic rate-limit message
- **AND** SHALL show retry timing guidance when `Retry-After` is present.

#### Scenario: Login UI avoids operational endpoint disclosure in non-development runtime
- **WHEN** login screen is rendered outside development runtime
- **THEN** frontend SHALL NOT display internal endpoint or base URL configuration values
- **AND** error/support messaging SHALL continue to use request-id based diagnostics.

