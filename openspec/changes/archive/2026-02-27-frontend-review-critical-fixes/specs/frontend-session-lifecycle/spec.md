## MODIFIED Requirements

### Requirement: Logout must clear auth state and protected query cache
The frontend logout flow SHALL clear session-sensitive state beyond access token values and SHALL remain deterministic even if server logout fails.

#### Scenario: Manual logout clears cache and session
- **WHEN** an authenticated user triggers logout
- **THEN** frontend SHALL attempt `POST /auth/logout`
- **AND** SHALL clear local auth session state
- **AND** SHALL clear or invalidate protected React Query caches
- **AND** SHALL route user to `/login`.

#### Scenario: Logout fallback remains deterministic on transport failure
- **WHEN** `POST /auth/logout` fails due to network/CORS/server error
- **THEN** frontend SHALL still clear local auth session state
- **AND** SHALL still route user to `/login`
- **AND** SHALL expose non-blocking failure feedback for diagnostics.

### Requirement: Public and protected route guards must honor hydration state
Route guards SHALL avoid premature redirects while hydration is in progress and avoid showing login screen when session is already recoverable.

#### Scenario: Protected route waits for hydration
- **WHEN** user lands on a protected route during startup hydration
- **THEN** frontend SHALL render a loading or skeleton guard state
- **AND** SHALL defer redirect until hydration resolves.

#### Scenario: Login route redirects for restored session
- **WHEN** user navigates to `/login` and session hydration resolves authenticated
- **THEN** frontend SHALL redirect to the intended protected destination from `location.state.from` when valid
- **AND** SHALL fallback to `/app/dashboard` when destination is absent or invalid
- **AND** SHALL NOT require credential re-entry.

