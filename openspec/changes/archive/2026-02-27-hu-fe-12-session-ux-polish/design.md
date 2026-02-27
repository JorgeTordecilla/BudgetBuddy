## Context

Frontend authentication currently works for common happy paths, but lifecycle behavior is split between route guards and client retry logic. This creates gaps in deterministic startup hydration, refresh failure handling, and post-logout cache hygiene. The goal is to define one contract-safe session state machine aligned with backend auth endpoints (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/me`).

## Goals / Non-Goals

**Goals:**
- Hydrate session deterministically on startup using cookie-based refresh followed by `/me` identity confirmation.
- Enforce one-retry-only behavior for 401 responses, backed by a shared refresh lock for concurrent failures.
- Keep users signed in when refresh succeeds and redirect only on explicit auth invalidation (`401/403` from refresh).
- Ensure logout clears client session and query cache to prevent stale data leakage.
- Validate behavior with unit/integration tests and frontend coverage gates.

**Non-Goals:**
- Reworking backend auth contracts or cookie semantics.
- Introducing role/permission systems.
- Persisting access tokens in browser storage.

## Decisions

1. Session hydration pipeline
- Decision: startup hydration SHALL execute `POST /auth/refresh` (cookie-based) and, on success, SHALL execute `GET /me` before marking session authenticated.
- Rationale: token-only state can become stale or mismatched; `/me` confirms current principal.
- Alternative considered: trusting refresh response user payload only; rejected for weaker lifecycle guarantees.

2. Authentication state source of truth
- Decision: authenticated UI state SHALL require both in-memory access token and resolved user identity.
- Rationale: protected routes should not render with partial session context.
- Alternative considered: token-only boolean; rejected due to transient false-positive auth state.

3. 401 recovery and concurrency
- Decision: all protected requests SHALL perform at most one refresh-and-retry cycle; concurrent 401s SHALL await a single shared refresh promise.
- Rationale: avoids thundering herd refresh calls and infinite retry loops.
- Alternative considered: per-request refresh attempts; rejected for race and load amplification.

4. Refresh failure policy
- Decision: explicit refresh `401/403` SHALL trigger logout and redirect to `/login`; network/CORS refresh failures SHALL surface UX error but SHALL NOT force logout automatically.
- Rationale: preserve session continuity during transient connectivity issues while failing closed on revoked/invalid refresh state.
- Alternative considered: logout on any refresh failure; rejected as poor reliability UX.

5. Logout cache hygiene
- Decision: logout SHALL clear auth state and invalidate/clear query cache.
- Rationale: prevents stale protected data rendering after user switch.
- Alternative considered: keep cache and rely on key scoping; rejected as fragile for current app surface.

## Risks / Trade-offs

- [Risk] Additional startup network call (`/me`) may slightly increase initial protected-route latency.
  - Mitigation: keep explicit hydrating state and lightweight skeleton.
- [Risk] Divergent handling between query and imperative actions could bypass shared retry policy.
  - Mitigation: route all API calls through shared client transport.
- [Risk] Aggressive cache clear on logout may increase refetch cost after next login.
  - Mitigation: acceptable trade-off for data isolation correctness.

## Migration Plan

1. Define session lifecycle requirements in OpenSpec capability specs.
2. Align `AuthContext` startup hydration with `refresh -> /me` semantics.
3. Harden API client retry policy and refresh failure branching.
4. Align route guards/public-route redirects with hydration state.
5. Add logout cache-clear integration.
6. Add/extend tests for lock, retry-once, hydration, and redirect behavior.
7. Validate with `npm run test`, `npm run test:coverage`, and `npm run build`.

## Open Questions

- Should `/register` be treated as a public route redirect target alongside `/login` in current frontend routing scope?
- Do we want a short grace timeout before redirect after refresh `401/403` to display a "session expired" notice?
- Should query cache clear be full (`queryClient.clear`) or scoped to protected domains only?
