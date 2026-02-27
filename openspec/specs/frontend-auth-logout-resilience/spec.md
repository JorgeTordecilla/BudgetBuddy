## Purpose

Define deterministic frontend logout behavior that guarantees local session teardown and consistent unauthenticated routing even when server logout is unavailable.
## Requirements
### Requirement: Logout MUST clear local session even when server logout fails
The frontend SHALL always clear in-memory auth state and protected cache boundaries when a user triggers logout, regardless of `POST /auth/logout` success or failure.

#### Scenario: Logout succeeds
- **WHEN** an authenticated user triggers logout and `POST /auth/logout` returns success
- **THEN** frontend SHALL clear local auth session state
- **AND** SHALL clear or invalidate protected query caches
- **AND** SHALL navigate to `/login`.

#### Scenario: Logout request fails transiently
- **WHEN** an authenticated user triggers logout and `POST /auth/logout` fails due to network or server error
- **THEN** frontend SHALL still clear local auth session state
- **AND** SHALL still navigate to `/login`
- **AND** SHALL surface a non-blocking error signal for observability.

### Requirement: Logout navigation MUST be deterministic from protected routes
Manual logout flow SHALL produce deterministic route transition out of `/app/*` without leaving stale authenticated UI.

#### Scenario: User logs out from app shell
- **WHEN** user triggers logout from any protected route under `/app/*`
- **THEN** frontend SHALL end on `/login`
- **AND** protected route content SHALL no longer render as authenticated.

#### Scenario: Post-logout guard behavior remains unauthenticated
- **WHEN** user attempts back navigation after logout
- **THEN** route guards SHALL keep protected routes inaccessible without re-authentication
- **AND** SHALL NOT rehydrate authenticated state from stale in-memory data.
