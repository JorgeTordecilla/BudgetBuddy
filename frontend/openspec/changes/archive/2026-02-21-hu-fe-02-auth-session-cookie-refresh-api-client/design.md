## Context

The frontend now has route/layout scaffolding from HU-FE-01, but authentication is still placeholder-only.  
Backend auth contract already supports enterprise-style session handling: short-lived access token in JSON response and rotating refresh token in HttpOnly cookie.

This HU must connect frontend session behavior to that contract while keeping security posture explicit:
- Access token only in memory
- Cookie refresh via browser credentials
- Deterministic route guard behavior on initial load and 401 responses.

## Goals / Non-Goals

**Goals:**
- Deliver working login/logout and protected route access.
- Restore session transparently after reload using refresh cookie.
- Standardize API fetch behavior (headers, credentials, retry-once refresh).
- Prevent refresh storms with a refresh lock (single inflight refresh).

**Non-Goals:**
- Persisting access tokens in browser storage.
- Role-based authorization or fine-grained permissions.
- SDK generation or full e2e suite hardening in this HU.

## Decisions

### 1. In-memory access token with context provider
- Decision: store `access_token` and `user` only in React context state.
- Rationale: reduces XSS blast radius compared with local/session storage.
- Alternative: localStorage persistence.
  - Rejected for security requirements.

### 2. Central API client with request policy
- Decision: route all API calls through `src/api/client.ts`.
- Policy:
  - `Accept: application/vnd.budgetbuddy.v1+json`
  - `Content-Type: application/vnd.budgetbuddy.v1+json` when request body exists
  - optional `X-Request-Id` per request
  - `credentials: "include"` always.
- Rationale: avoids duplicated logic and policy drift.

### 3. 401 recovery via refresh then single retry
- Decision:
  - On 401 from protected request: call `/auth/refresh`
  - If refresh succeeds: update memory token and retry original request once
  - If refresh fails (401/403): force logout and redirect `/login`.
- Rationale: resilient UX without infinite loops.
- Alternative: no automatic retry.
  - Rejected because it degrades normal session continuity.

### 4. Global refresh lock
- Decision: keep one shared Promise lock for refresh operation.
- Rationale: prevents concurrent failing calls from flooding `/auth/refresh`.

### 5. Guard bootstrap path
- Decision: `RequireAuth` attempts one refresh when no valid memory token exists.
- Rationale: page reload on protected routes should recover session seamlessly if cookie is valid.

## Risks / Trade-offs

- [Risk] Refresh loop bugs can cause repeated redirects or request storms. -> Mitigation: strict single-retry and refresh-lock logic.
- [Risk] Cross-site cookie behavior differs between local/prod browsers. -> Mitigation: always use `credentials: include` and keep manual verification matrix.
- [Risk] Race between logout and inflight refresh requests. -> Mitigation: clear in-memory state first and reject/ignore late refresh resolution.
- [Risk] Request-id generation overhead/noise. -> Mitigation: lightweight UUID per request and dev-only failure logging.

## Migration Plan

1. Add auth provider/hooks (`AuthContext`, `useAuth`).
2. Add API client wrapper with headers/credentials/retry lock.
3. Wire login page submit to `/auth/login`.
4. Update `RequireAuth` to use real auth bootstrap/refresh.
5. Add logout action and protected-route enforcement.
6. Add unit tests for refresh-on-401 and refresh-failure logout handling.
7. Execute manual end-to-end verification script.
