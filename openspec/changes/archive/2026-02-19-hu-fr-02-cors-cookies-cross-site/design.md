## Context

BudgetBuddy already moved refresh-session transport to HttpOnly cookies for web security. In cross-site deployments, browsers only attach those cookies when CORS is configured for credentialed requests with explicit origin matching. The current change must harden runtime CORS behavior and document contract expectations without altering existing success/error media types or canonical ProblemDetails semantics.

## Goals / Non-Goals

**Goals:**
- Enforce deterministic, environment-driven CORS allowlist behavior (no wildcard origins) for frontend-to-API cross-site usage.
- Guarantee `allow_credentials=true` so browser refresh cookies can be sent for login/refresh/logout flows.
- Standardize allowed methods/headers and exposed response headers (`X-Request-Id`, `Retry-After`).
- Add integration tests for preflight and real requests carrying `Origin`.
- Keep contract-first consistency between runtime behavior and OpenAPI/OpenSpec notes.

**Non-Goals:**
- Changing auth token semantics, cookie attributes, or refresh rotation rules introduced in HU-FR-01.
- Introducing dynamic per-tenant CORS policy, regex origins, or wildcard credential behavior.
- Changing API payload media types, response schemas, or canonical ProblemDetails catalog values.

## Decisions

### 1. CORS origins are explicit and environment-driven
- Add a parsed origin list setting (`BUDGETBUDDY_CORS_ORIGINS`) with deterministic split/trim behavior.
- Provide development default `http://localhost:5173`.
- Reject wildcard `*` usage in configured origins when credentials are enabled.

Rationale: browsers disallow credentialed wildcard-origin flows and production environments require explicit trust boundaries.
Alternative considered: allow-all in development plus runtime overrides. Rejected to avoid behavior drift between environments.

### 2. Middleware policy is centralized at application startup
- Configure FastAPI `CORSMiddleware` in app initialization (`backend/app/main.py` or equivalent startup wiring).
- Use:
  - `allow_credentials=True`
  - `allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"]`
  - `allow_headers=["Authorization","Content-Type","Accept","X-Request-Id"]`
  - `expose_headers=["X-Request-Id","Retry-After"]`

Rationale: one centralized policy avoids per-router inconsistencies and keeps behavior predictable.
Alternative considered: custom per-route CORS handling. Rejected due to complexity and higher regression risk.

### 3. Contract notes remain descriptive, not schema-breaking
- Keep OpenAPI payload contracts intact.
- Add/align endpoint descriptions and integration notes to reflect credentialed CORS expectations for cross-site frontend usage.

Rationale: CORS is primarily transport metadata and middleware behavior; no endpoint payload schema changes are required.
Alternative considered: model CORS headers per operation exhaustively. Rejected to avoid excessive contract noise.

### 4. Verification emphasizes browser-relevant behavior
- Add integration tests for:
  - Preflight `OPTIONS /api/auth/refresh` with Origin and requested headers/method.
  - Real auth requests with Origin asserting `Access-Control-Allow-Origin` echo and `Access-Control-Allow-Credentials=true`.
  - Exposed headers include `X-Request-Id` and `Retry-After`.

Rationale: these are the minimum checks that prove cross-site cookie flows work in real browsers.

## Risks / Trade-offs

- [Risk] Misconfigured production origins block frontend auth flows -> Mitigation: explicit env var format, safe dev default, and integration tests validating expected headers.
- [Risk] Overly broad CORS configuration increases attack surface -> Mitigation: disallow wildcard with credentials and keep strict method/header lists.
- [Risk] Middleware behavior differences across frameworks/versions -> Mitigation: enforce tests against concrete response headers for preflight and actual requests.
- [Risk] Contract drift between runtime and docs -> Mitigation: update OpenAPI/OpenSpec notes in same change and verify before archive.

## Migration Plan

1. Add CORS settings parser and defaults in runtime config.
2. Wire `CORSMiddleware` with the new credentialed policy in app startup.
3. Add/adjust integration tests for preflight and Origin-based requests.
4. Update OpenAPI notes and mirror spec file for contract-first traceability.
5. Run full test suite and coverage checks.

Rollback:
- Revert CORS setting and middleware wiring commit.
- Restore previous OpenAPI notes if needed.
- Keep auth cookie transport unchanged (HU-FR-01 remains intact).

## Open Questions

- Should production require an explicit non-empty `BUDGETBUDDY_CORS_ORIGINS` and fail fast at startup if missing?
- Do we need to include additional frontend headers (for example `X-Correlation-Id`) in `allow_headers` now, or defer until a concrete client need appears?
