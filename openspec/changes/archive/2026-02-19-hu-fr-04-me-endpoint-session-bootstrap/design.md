## Context

BudgetBuddy web clients already authenticate with bearer access tokens and can refresh sessions via the auth flow. However, frontend bootstrap still lacks a dedicated endpoint to retrieve the current authenticated user independently of login/refresh timing, which increases client state complexity. This change adds a standard enterprise-style `GET /me` contract while preserving existing media-type and ProblemDetails conventions.

## Goals / Non-Goals

**Goals:**
- Add `GET /me` as an authenticated session introspection endpoint returning canonical `User` data.
- Keep error taxonomy aligned with existing canonical ProblemDetails constants:
  - `401 unauthorized`
  - `406 not-acceptable`
- Ensure response header behavior includes `X-Request-Id` consistently.
- Keep OpenAPI source (`backend/openapi.yaml`) and mirror (`openspec/specs/openapi.yaml`) synchronized.
- Add integration tests for authenticated and unauthenticated `GET /me` scenarios.

**Non-Goals:**
- No change to login/refresh/logout semantics or cookie transport behavior.
- No new user profile schema fields; reuse existing `User` schema.
- No new ProblemDetails types or status codes.
- No pagination/filtering or user-management feature expansion.

## Decisions

### 1. Implement `GET /me` in auth-facing router
Place `GET /me` in `backend/app/routers/auth.py` (or existing auth/session module) and protect it with existing auth dependency.

Rationale: session introspection is tightly coupled to auth context and should stay with auth endpoints for discoverability.
Alternative considered: dedicated `users.py` endpoint group. Rejected for now to avoid fragmented session contract surface.

### 2. Return existing `User` schema with vendor media type
Use the existing `User` response schema and `application/vnd.budgetbuddy.v1+json` for `200`.

Rationale: avoids schema drift and keeps SDK compatibility predictable.
Alternative considered: a new `MeResponse` wrapper. Rejected to avoid unnecessary payload indirection.

### 3. Reuse canonical error constants and ProblemDetails mapping
`GET /me` errors must use current canonical mappings:
- missing/invalid bearer -> `401 unauthorized`
- unsupported `Accept` -> `406 not-acceptable`

Rationale: preserves global error taxonomy consistency and frontend error handling expectations.
Alternative considered: endpoint-specific `401/406` details with new types. Rejected because no new semantics are introduced.

### 4. Keep header behavior explicit in contract
Document `X-Request-Id` response header for `GET /me` success and error responses, consistent with operational conventions.

Rationale: frontend observability and traceability depend on deterministic header availability.

## Risks / Trade-offs

- [Risk] Route placement ambiguity (`auth.py` vs `users.py`) may create style inconsistency later -> Mitigation: keep in auth module now and revisit only if broader user-profile API is introduced.
- [Risk] Accept negotiation regressions on a new endpoint -> Mitigation: reuse existing negotiation dependency/path and add integration test coverage for `406` if contract asserts it.
- [Risk] Frontend may still call login/refresh for bootstrap out of habit -> Mitigation: document `/me` as the preferred bootstrap endpoint in contract/examples.

## Migration Plan

1. Add `GET /me` handler using existing auth dependency and `User` schema serialization.
2. Update `backend/openapi.yaml` with `200/401/406` responses and `X-Request-Id` header mapping.
3. Mirror contract updates in `openspec/specs/openapi.yaml`.
4. Add integration tests:
   - authorized call returns `200` and `User`
   - unauthorized call returns canonical `401` ProblemDetails
5. Run test suite and coverage checks.

Rollback:
- Remove `GET /me` route and corresponding OpenAPI entries.
- Revert integration tests specific to `/me`.

## Open Questions

- Should we add an explicit integration test for `406 Not Acceptable` on `/me` now, or defer to existing global accept-negotiation matrix tests?
- Should `/me` include optional session metadata in the future (e.g., token expiry hints), or remain strictly `User` for contract stability?
