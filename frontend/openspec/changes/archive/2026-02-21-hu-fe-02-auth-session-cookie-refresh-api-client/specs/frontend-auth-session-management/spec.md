## ADDED Requirements

### Requirement: Login establishes browser session and in-memory access token
The frontend MUST authenticate users through `POST /auth/login` and store access token material in memory only.

#### Scenario: Successful login transitions to protected area
- **WHEN** a user submits valid credentials on `/login`
- **THEN** the frontend SHALL call `POST /auth/login` with vendor media types
- **AND** it SHALL store `access_token` and user payload in memory state only
- **AND** it SHALL navigate to `/app/dashboard`

#### Scenario: Login failure shows canonical error handling path
- **WHEN** backend returns an authentication failure for login
- **THEN** the frontend SHALL keep user unauthenticated
- **AND** it SHALL present a safe error message without leaking internal details

#### Scenario: Login route auto-restores existing session
- **WHEN** a user manually navigates to `/login` while a valid refresh cookie exists
- **THEN** the frontend SHALL attempt refresh bootstrap once
- **AND** it SHALL redirect to `/app/dashboard` without prompting for credentials

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
