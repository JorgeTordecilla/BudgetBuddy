# frontend-auth-session-management Specification

## Purpose
Define secure frontend session behavior using in-memory access tokens and HttpOnly cookie-based refresh flows.

## Requirements
### Requirement: Login establishes browser session and in-memory access token
The frontend MUST authenticate users through `POST /auth/login` and `POST /auth/register`, and store access token material in memory only.

#### Scenario: Successful login transitions to protected area
- **WHEN** a user submits valid credentials on `/login`
- **THEN** the frontend SHALL call `POST /auth/login` with vendor media types
- **AND** it SHALL store `access_token` and user payload in memory state only
- **AND** it SHALL navigate to `/app/dashboard`

#### Scenario: Login failure shows canonical error handling path
- **WHEN** backend returns an authentication failure or request-validation failure for login
- **THEN** the frontend SHALL keep user unauthenticated
- **AND** it SHALL render canonical user-facing messaging derived from normalized `ProblemDetails` mapping
- **AND** it SHALL avoid misleading fixed copy that contradicts backend failure category

#### Scenario: Login validation failure preserves actionable guidance
- **WHEN** login returns a `400` ProblemDetails validation failure (including `about:blank` with safe validation detail)
- **THEN** the frontend SHALL present validation-appropriate guidance instead of invalid-credentials messaging
- **AND** it SHALL preserve safe actionable detail per centralized error UX policy

#### Scenario: Login route auto-restores existing session
- **WHEN** a user manually navigates to `/login` while a valid refresh cookie exists
- **THEN** the frontend SHALL attempt refresh bootstrap once
- **AND** it SHALL redirect to `/app/dashboard` without prompting for credentials

#### Scenario: Successful register transitions to protected area
- **WHEN** a user submits valid registration data on `/register`
- **THEN** the frontend SHALL call `POST /auth/register` with vendor media types
- **AND** it SHALL store `access_token` and user payload in memory state only
- **AND** it SHALL navigate to `/app/dashboard` (or intended protected destination when present)

#### Scenario: Register failure shows canonical error handling path
- **WHEN** backend returns register validation or conflict failure
- **THEN** the frontend SHALL keep user unauthenticated
- **AND** it SHALL present canonical mapped messaging consistent with centralized ProblemDetails UX policy

#### Scenario: Register route auto-redirects for authenticated sessions
- **WHEN** an authenticated user manually navigates to `/register`
- **THEN** the frontend SHALL redirect to `/app/dashboard` (or intended protected destination)
- **AND** it SHALL NOT prompt for registration fields

### Requirement: Access token is never persisted in browser storage
The frontend MUST NOT persist bearer tokens in `localStorage` or `sessionStorage`.

#### Scenario: Session state remains memory-only
- **WHEN** a successful login occurs
- **THEN** access token material SHALL exist only in process memory/context state
- **AND** no token value SHALL be written to browser persistent storage

### Requirement: API client enforces request policy and credentials mode
The frontend API client MUST centralize HTTP policy for authenticated and refresh-capable requests.

#### Scenario: Standard headers and credentials are attached
- **WHEN** the client issues API requests
- **THEN** it SHALL send `Accept: application/vnd.budgetbuddy.v1+json`
- **AND** it SHALL send `credentials: include`
- **AND** it SHALL include `Content-Type: application/vnd.budgetbuddy.v1+json` when request body is sent

#### Scenario: Optional request-id is available for diagnostics
- **WHEN** the client issues a request
- **THEN** it MAY include `X-Request-Id`
- **AND** failed requests in development SHALL log the request id for tracing

### Requirement: 401 responses trigger single refresh-and-retry flow
The frontend MUST recover expired access tokens through cookie-based refresh with bounded retry behavior.

#### Scenario: Protected request retries once after refresh
- **WHEN** an authenticated API call returns `401`
- **THEN** frontend SHALL call `POST /auth/refresh` once with credentials included
- **AND** if refresh succeeds it SHALL update memory token
- **AND** it SHALL retry the original request exactly once

#### Scenario: Refresh failure forces unauthenticated state
- **WHEN** refresh returns `401` or `403`
- **THEN** frontend SHALL clear auth memory state
- **AND** it SHALL redirect users to `/login`

#### Scenario: Concurrent 401 failures share one refresh operation
- **WHEN** multiple requests fail with `401` concurrently
- **THEN** frontend SHALL use a single global inflight refresh lock
- **AND** it SHALL avoid parallel refresh storms

### Requirement: Route guard bootstraps session from refresh cookie
Protected route access MUST attempt session recovery before redirecting unauthenticated users.

#### Scenario: Reload on protected route restores session
- **WHEN** a user opens or reloads `/app/dashboard` without memory token but with valid refresh cookie
- **THEN** `RequireAuth` SHALL attempt refresh bootstrap
- **AND** it SHALL allow access if refresh succeeds

#### Scenario: Guard redirects when bootstrap fails
- **WHEN** protected route bootstrap refresh fails
- **THEN** `RequireAuth` SHALL redirect to `/login`

### Requirement: Logout clears client and server session state
Logout behavior MUST invalidate both browser session cookie state (server-side endpoint) and frontend memory state.

#### Scenario: Logout ends active session
- **WHEN** an authenticated user triggers logout
- **THEN** frontend SHALL call `POST /auth/logout` with credentials included
- **AND** it SHALL clear in-memory token/user state
- **AND** it SHALL redirect to `/login`

### Requirement: Optimistic auth bootstrap SHALL support safe cached-user hydration
The frontend SHALL allow immediate auth-shell rendering from a cached `User` profile in browser storage (`localStorage` primary, `sessionStorage` fallback) while refresh validation runs in background.

#### Scenario: Cached user enables immediate auth rendering during refresh bootstrap
- **WHEN** `bootstrapSession` starts with no in-memory token and browser storage contains a valid cached user shape
- **THEN** the frontend SHALL set session user state immediately with `accessToken = null`
- **AND** it SHALL continue refresh validation in background without blocking render behind a bootstrap loader.

#### Scenario: Cached user is cleared when bootstrap refresh fails
- **WHEN** background refresh during bootstrap fails
- **THEN** frontend SHALL clear auth session state
- **AND** it SHALL remove cached user entry from both `localStorage` and `sessionStorage`.

### Requirement: Storage access failures SHALL not break auth flow
Auth bootstrap and session state transitions SHALL treat browser storage as optional infrastructure.

#### Scenario: Cached user read failure degrades gracefully
- **WHEN** browser storage access (`localStorage.getItem` or `sessionStorage.getItem`) throws (including `SecurityError`)
- **THEN** cached user hydration SHALL return `null` without throwing
- **AND** bootstrap SHALL continue through normal refresh path.

#### Scenario: Cached user write/remove failure does not block state transition
- **WHEN** cached-user write/remove to browser storage throws
- **THEN** frontend SHALL still update React auth session state normally
- **AND** it SHALL not surface blocking runtime errors to the user.
