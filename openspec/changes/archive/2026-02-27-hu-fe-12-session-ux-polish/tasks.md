## 1. Session Lifecycle Contract

- [x] 1.1 Define startup hydration behavior as `POST /auth/refresh` followed by `GET /me` before marking authenticated state.
- [x] 1.2 Define authenticated-state invariants (`accessToken` + `user`) and hydrating-state transitions.
- [x] 1.3 Define protected/public route guard behavior for hydrating, authenticated, and unauthenticated states.

## 2. API Client Refresh and Retry Policy

- [x] 2.1 Enforce single in-flight refresh lock for concurrent 401 responses.
- [x] 2.2 Enforce one retry per original request after successful refresh; prevent loops.
- [x] 2.3 Differentiate refresh failure outcomes:
  - explicit auth failure (`401/403`) => logout + redirect
  - network/CORS failure => preserve session and render global error UX.

## 3. Logout and Data Hygiene

- [x] 3.1 Ensure logout clears local auth state deterministically.
- [x] 3.2 Clear/invalidate React Query cache on logout to prevent stale cross-user data.
- [x] 3.3 Ensure logout UX remains consistent from app shell and auth-expired flows.

## 4. Global Error UX Integration

- [x] 4.1 Align session-expired and refresh-failure paths with `frontend-error-ux` mappings.
- [x] 4.2 Preserve `X-Request-Id` surfacing for auth/session failure states.

## 5. Tests

- [x] 5.1 Unit: concurrent 401 requests share one refresh call.
- [x] 5.2 Unit: 401 -> refresh success -> retry success.
- [x] 5.3 Unit: 401 -> refresh 403 -> logout + redirect.
- [x] 5.4 Unit: 401 -> refresh success -> retry 401 -> logout + redirect.
- [x] 5.5 Unit: startup hydration success path (`refresh -> /me`) sets authenticated state.
- [x] 5.6 Unit: startup hydration explicit auth failure leaves unauthenticated state.

## 6. Verification

- [x] 6.1 Run `npm run test` in `frontend`.
- [x] 6.2 Run `npm run test:coverage` in `frontend` and satisfy project thresholds.
- [x] 6.3 Run `npm run build` in `frontend`.