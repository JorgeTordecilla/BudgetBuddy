## 1. Auth state foundation

- [x] 1.1 Add `src/auth/AuthContext.tsx` with memory-only session state (`user`, `accessToken`, auth status).
- [x] 1.2 Add `src/auth/useAuth.ts` hook for guarded access to auth context.
- [x] 1.3 Ensure no token persistence in `localStorage` or `sessionStorage`.

## 2. API client and refresh policy

- [x] 2.1 Add `src/api/client.ts` fetch wrapper with vendor media-type headers and `credentials: "include"`.
- [x] 2.2 Attach bearer token when access token exists.
- [x] 2.3 Implement 401 flow: refresh once via `POST /auth/refresh`, retry original request once.
- [x] 2.4 Implement global refresh lock to avoid concurrent refresh storms.
- [x] 2.5 On refresh failure (401/403), clear auth state and route to `/login`.
- [x] 2.6 Add optional per-request `X-Request-Id` generation and dev failure logging.

## 3. Auth screens and guard wiring

- [x] 3.1 Update login page to submit credentials to `POST /auth/login`.
- [x] 3.2 On successful login, store session in memory and redirect to `/app/dashboard`.
- [x] 3.3 Update `RequireAuth` to attempt refresh bootstrap when token is missing.
- [x] 3.4 Ensure protected routes remain blocked and redirect to `/login` when bootstrap fails.
- [x] 3.5 Add logout action calling `POST /auth/logout`, clear state, and redirect to `/login`.

## 4. Route/provider integration

- [x] 4.1 Wrap router with `AuthProvider` in application entrypoint.
- [x] 4.2 Ensure protected route tree reads auth state from provider rather than placeholder constant.

## 5. Verification

- [x] 5.1 Add unit test for refresh-on-401 retry-once behavior in API client.
- [x] 5.2 Add unit test ensuring refresh failure triggers logout state path.
- [x] 5.3 Execute manual flow:
  - login success -> `/app/dashboard`
  - reload protected page -> session restored via refresh
  - logout -> redirected to `/login`
  - direct `/app/dashboard` after logout -> redirected to `/login`
- [x] 5.4 Run `openspec validate hu-fe-02-auth-session-cookie-refresh-api-client`.
