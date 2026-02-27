## Purpose

Define deterministic frontend session lifecycle behavior for hydration, 401 recovery, guarded routing, and logout hygiene using the existing auth contract.
## Requirements
### Requirement: Frontend startup hydration must restore session deterministically
The frontend SHALL bootstrap session state on app load by using cookie-based refresh and identity confirmation before rendering protected routes as authenticated.

#### Scenario: Hydration succeeds with valid refresh cookie
- **WHEN** the app loads without an in-memory access token but the browser has a valid `bb_refresh` cookie
- **THEN** frontend SHALL call `POST /auth/refresh`
- **AND** on success SHALL call `GET /me`
- **AND** SHALL set in-memory `accessToken` and `user`
- **AND** protected routes SHALL render without requiring manual login.

#### Scenario: Hydration fails with explicit auth invalidation
- **WHEN** startup refresh returns `401` or `403`
- **THEN** frontend SHALL keep session unauthenticated
- **AND** protected routes SHALL redirect to `/login`.

### Requirement: Protected transport must retry once after refresh and share concurrency lock
The frontend API client SHALL use one shared refresh promise for concurrent 401 failures and SHALL retry each failed request at most once.

#### Scenario: Concurrent 401 requests trigger a single refresh
- **WHEN** multiple protected requests receive `401` concurrently
- **THEN** frontend SHALL issue exactly one `POST /auth/refresh`
- **AND** awaiting requests SHALL reuse that refresh result.

#### Scenario: Request recovers after refresh
- **WHEN** a protected request receives `401` and refresh succeeds
- **THEN** frontend SHALL retry the original request once with new bearer token
- **AND** successful retry SHALL return normal data flow.

#### Scenario: Retry loop is prevented
- **WHEN** retried request returns `401` again
- **THEN** frontend SHALL NOT attempt a second refresh/retry loop
- **AND** session SHALL transition to unauthenticated handling.

### Requirement: Refresh failures must distinguish auth invalidation from transient network errors
Session teardown policy SHALL be explicit and deterministic for refresh failures.

#### Scenario: Refresh unauthorized/revoked forces logout
- **WHEN** `POST /auth/refresh` returns `401` or `403`
- **THEN** frontend SHALL clear local session
- **AND** SHALL redirect to `/login`.

#### Scenario: Refresh network failure does not force logout
- **WHEN** `POST /auth/refresh` fails due to network/CORS error without explicit `401/403`
- **THEN** frontend SHALL preserve current session state
- **AND** SHALL surface a global recoverable error UX.

### Requirement: Logout must clear auth state and protected query cache
The frontend logout flow SHALL clear session-sensitive state beyond access token values.

#### Scenario: Manual logout clears cache and session
- **WHEN** an authenticated user triggers logout
- **THEN** frontend SHALL call `POST /auth/logout`
- **AND** SHALL clear local auth session state
- **AND** SHALL clear or invalidate protected React Query caches
- **AND** SHALL route user to `/login`.

### Requirement: Public and protected route guards must honor hydration state
Route guards SHALL avoid premature redirects while hydration is in progress and avoid showing login screen when session is already recoverable.

#### Scenario: Protected route waits for hydration
- **WHEN** user lands on a protected route during startup hydration
- **THEN** frontend SHALL render a loading/skeleton guard state
- **AND** SHALL defer redirect until hydration resolves.

#### Scenario: Login route redirects for restored session
- **WHEN** user navigates to `/login` and session hydration resolves authenticated
- **THEN** frontend SHALL redirect to `/app/dashboard` (or intended protected destination)
- **AND** SHALL NOT require credential re-entry.

### Requirement: Session lifecycle behavior must satisfy frontend quality gates
The session lifecycle implementation SHALL be validated with deterministic tests and project quality checks.

#### Scenario: Session lifecycle tests are present and passing
- **WHEN** implementation is verified
- **THEN** tests SHALL cover refresh locking, retry-once behavior, hydration success/failure, and redirect outcomes.

#### Scenario: Frontend quality gates pass
- **WHEN** verification is executed
- **THEN** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass
- **AND** coverage SHALL meet project thresholds.

### Requirement: Session lifecycle, refresh retry, and route-guard behavior must be deterministic
Frontend production session behavior MUST remain predictable under cross-site cookie constraints, with explicit operator-facing guidance for configuration and security boundaries.

#### Scenario: Production auth requirements are documented for cross-site cookie sessions
- **WHEN** frontend production deployment is configured
- **THEN** frontend documentation SHALL list required backend conditions:
  - CORS origin allowlist includes frontend deploy domain
  - `Access-Control-Allow-Credentials: true`
  - refresh cookie flags include `HttpOnly`, `Secure`, and `SameSite=None`
- **AND** documentation SHALL include troubleshooting guidance for session restoration failures.

#### Scenario: CSRF risk is explicitly tracked as follow-up
- **WHEN** cross-site refresh-cookie model is documented
- **THEN** frontend documentation SHALL explicitly mark CSRF strategy as a follow-up security decision
- **AND** SHALL avoid implying CSRF is already solved by this change.

