## Purpose

Define a consistent, contract-first frontend error UX for ProblemDetails handling, request correlation, and React Query lifecycle behavior.
## Requirements
### Requirement: Frontend error parsing must normalize contract and transport failures
The frontend SHALL normalize failed HTTP and network operations into a typed error model that preserves ProblemDetails semantics and observability metadata.

#### Scenario: ProblemDetails response is normalized
- **WHEN** a response content type is `application/problem+json`
- **THEN** frontend SHALL parse `type`, `title`, `status`, optional `detail`, optional `instance`
- **AND** include `X-Request-Id` when present in a normalized error object.

#### Scenario: Non-Problem HTTP error is normalized
- **WHEN** a response is non-2xx and content type is not `application/problem+json`
- **THEN** frontend SHALL produce a deterministic unknown API error with `httpStatus`
- **AND** include `X-Request-Id` when present.

#### Scenario: Network/CORS/timeout failure is normalized
- **WHEN** request execution fails before receiving an HTTP response
- **THEN** frontend SHALL produce a deterministic network error classification
- **AND** SHALL not fabricate a request id.

### Requirement: Frontend ProblemDetails mapping must be centralized and deterministic
The frontend SHALL map canonical `problem.type` values to user-facing messages and presentation mode using a single shared catalog.

#### Scenario: Known canonical types map to deterministic UX
- **WHEN** normalized ProblemDetails contains a known canonical `type`
- **THEN** frontend SHALL resolve message and presentation from one central mapping source
- **AND** reuse that mapping across routes and shared error components

#### Scenario: Unknown problem types use safe fallback with controlled detail policy
- **WHEN** normalized ProblemDetails contains an unknown `type` (including `about:blank`)
- **THEN** frontend SHALL resolve deterministic fallback messaging and presentation
- **AND** it SHALL avoid exposing potentially sensitive raw backend detail by default
- **AND** it SHALL allow safe actionable detail when failure category is request validation and detail is suitable for end-user guidance

#### Scenario: Session-expired auth failures follow mapped UX policy
- **WHEN** refresh flow returns ProblemDetails with unauthorized or forbidden auth types
- **THEN** frontend SHALL render deterministic mapped messaging
- **AND** request-id visibility/copy behavior SHALL remain available in the error presentation path.

#### Scenario: Equivalent ProblemDetails payloads render equivalent messages across surfaces
- **WHEN** the same normalized ProblemDetails is rendered via inline form state, shared inline component, or banner/toast entry points
- **THEN** frontend SHALL display equivalent user-facing message semantics
- **AND** it SHALL avoid contradictory messaging between components for the same failure

### Requirement: Error UI must expose request id and support copy interaction
All rendered frontend error surfaces SHALL display request correlation metadata when available.

#### Scenario: Inline error shows request id and copy action
- **WHEN** an inline error is rendered with a request id
- **THEN** frontend SHALL display `Request ID` and a copy control
- **AND** copy action SHALL provide user feedback.

#### Scenario: Toast error shows request id and copy action
- **WHEN** a toast error is rendered with a request id
- **THEN** frontend SHALL display `Request ID` and a copy control
- **AND** copy action SHALL provide user feedback.

### Requirement: Global query/mutation error policy must be consistent
Frontend error rendering policy SHALL be consistent across React Query query and mutation lifecycles.

#### Scenario: Query failures default to inline-first handling
- **WHEN** a page-level query fails
- **THEN** frontend SHALL support inline error rendering with retry affordance
- **AND** may trigger toast only when mapping explicitly requires toast or both.

#### Scenario: Mutation failures default to toast with optional inline form context
- **WHEN** a mutation fails
- **THEN** frontend SHALL trigger toast by default
- **AND** SHALL allow form-level inline rendering when the screen has actionable field context.

### Requirement: Frontend quality gates must verify global error UX behavior
The global error UX rollout SHALL be guarded by unit/component verification and existing frontend quality gates.

#### Scenario: Core parsing and mapping tests pass
- **WHEN** global error UX is implemented
- **THEN** tests SHALL cover parsing of ProblemDetails/non-Problem/network errors and mapping fallback behavior.

#### Scenario: Error components and copy interaction are verified
- **WHEN** inline/toast error components render request ids
- **THEN** tests SHALL verify request-id rendering and copy interaction behavior.

#### Scenario: Frontend verification commands pass
- **WHEN** change verification is executed
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass
- **AND** coverage SHALL remain at or above frontend project thresholds.

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

#### Scenario: Error telemetry carries ProblemDetails correlation context
- **WHEN** frontend captures an API failure represented as ProblemDetails
- **THEN** telemetry payload SHALL include `problem.type`, `problem.title`, and `problem.status`
- **AND** SHALL include `X-Request-Id` when available.

#### Scenario: Error telemetry carries request route/method context
- **WHEN** frontend captures API-level failures in production observability
- **THEN** telemetry payload SHALL include endpoint path and HTTP method context
- **AND** diagnostics SHALL remain compatible with request-id based support workflows.

#### Scenario: Sensitive auth data is not emitted to observability providers
- **WHEN** frontend reports runtime or API errors
- **THEN** access tokens, refresh cookies, and credential payloads SHALL NOT be attached to events
- **AND** only allowlisted diagnostic metadata SHALL be emitted.

### Requirement: Auth pages SHALL expose actionable retry semantics for rate-limit and service unavailability
Login and Register routes SHALL render deterministic, actionable UX for `429` and `503` failures using normalized error metadata.

#### Scenario: Retry-After creates visible countdown and submit lockout
- **WHEN** auth submit fails with mapped `retryAfter` value greater than zero
- **THEN** frontend SHALL display a countdown message (`Retry in Xs`)
- **AND** submit action SHALL remain disabled until countdown reaches zero.

#### Scenario: Service unavailable exposes explicit retry action
- **WHEN** auth submit fails with mapped HTTP status `503`
- **THEN** frontend SHALL render service-unavailable messaging
- **AND** it SHALL expose a retry action that triggers a new submit attempt.

### Requirement: Auth pages SHALL prioritize submit-state rendering deterministically
Auth submit controls SHALL follow one explicit state precedence to avoid contradictory messaging.

#### Scenario: Submitting state has higher priority than countdown state
- **WHEN** auth submit is in-flight and retry countdown is non-zero
- **THEN** button label SHALL render submitting copy (`Signing in...` / `Creating account...`)
- **AND** button SHALL remain disabled due to submitting state.

#### Scenario: Retry action resets countdown before new submit attempt
- **WHEN** user triggers retry action from service-unavailable state
- **THEN** countdown state SHALL be reset to zero before submit starts
- **AND** button UI SHALL transition directly to submitting state without mixed labels.

### Requirement: Offline auth failures SHALL use explicit offline messaging
Auth pages SHALL distinguish offline client failure from server-side auth failures.

#### Scenario: Offline catch path uses dedicated message
- **WHEN** auth submit catch executes while `navigator.onLine` is false
- **THEN** frontend SHALL render dedicated offline copy
- **AND** it SHALL avoid rendering misleading credential or server-status messaging.

### Requirement: Auth pages SHALL enforce shared frontend password policy prechecks
Login and Register SHALL block submit attempts when password does not satisfy the shared frontend complexity policy.

#### Scenario: Invalid password pattern blocks submit before API call
- **WHEN** password misses any required class (uppercase, lowercase, number, special) or length < 8
- **THEN** frontend SHALL render a deterministic inline error message
- **AND** it SHALL not call auth API submit handlers.

#### Scenario: Shared password policy implementation is reused across auth routes
- **WHEN** login and register perform password prechecks
- **THEN** both SHALL use a shared policy source (single helper/module)
- **AND** policy message/regex semantics SHALL remain identical across routes.
