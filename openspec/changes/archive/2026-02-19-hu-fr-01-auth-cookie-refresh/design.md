## Context

BudgetBuddy currently models refresh-token flows with JSON transport (`refresh_token` in auth response bodies and refresh inputs). For enterprise web deployments, this increases exposure risk because JS-readable token surfaces can be abused in XSS scenarios. The desired model is browser-managed refresh sessions via `HttpOnly` cookie while preserving Bearer access tokens in `Authorization`.

Constraints:
- Contract-first workflow (`backend/openapi.yaml` is source of truth).
- Canonical media types must remain unchanged.
- Existing rate-limiting, replay detection, and ProblemDetails behavior must remain deterministic.
- Cross-site compatibility must use secure cookie attributes (`Secure` + `SameSite=None`).

## Goals / Non-Goals

**Goals:**
- Move login/refresh/logout refresh-token transport to a fixed `bb_refresh` HttpOnly cookie.
- Remove `refresh_token` from login/refresh success JSON payloads.
- Make `POST /auth/refresh` cookie-driven with no request body requirement.
- Define deterministic cookie lifecycle: set on login, rotate on refresh, expire on logout.
- Update OpenAPI + SDK generation inputs to represent the new contract.
- Preserve canonical ProblemDetails and existing replay-protection semantics.

**Non-Goals:**
- Replacing Bearer access-token usage for protected domain endpoints.
- Introducing multi-cookie session partitioning or device-session UX changes.
- Redesigning global CORS policy in this change (must remain compatible with credentialed requests).
- Changing business semantics unrelated to auth token transport.

## Decisions

### 1. Cookie as the only refresh transport for login/refresh/logout
- `bb_refresh` becomes authoritative for refresh lifecycle in web flows.
- `POST /auth/login` sets cookie and returns auth payload without `refresh_token`.
- `POST /auth/refresh` reads refresh token from cookie, rotates server-side token state, and returns new access token plus rotated cookie.
- `POST /auth/logout` expires cookie and revokes refresh state.

Rationale: minimizes token exposure to JS and aligns with enterprise browser patterns.
Alternative considered: dual-mode body+cookie compatibility. Rejected because it weakens hardening and complicates contract/test matrix.

### 2. Fixed cookie policy defaults with config-backed overrides where safe
- Cookie name fixed to `bb_refresh`.
- Mandatory attributes: `HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, `Max-Age=<refresh_ttl_seconds>`.
- Runtime settings provide TTL and optional domain wiring for deployment environments.

Rationale: deterministic contract and safer defaults across environments.
Alternative considered: dynamic cookie name/path. Rejected to avoid frontend ambiguity and brittle integration.

### 3. Canonical error taxonomy preserved, transport-specific mapping clarified
- Missing/malformed/expired cookie token: canonical `401 unauthorized`.
- Revoked/reused token: canonical `403` (`refresh-revoked` / `refresh-reuse-detected`).
- No internal token parser details in client-visible `detail`.

Rationale: keeps existing error contract stable while reflecting cookie transport inputs.

### 4. OpenAPI and SDK are synchronized as a single deliverable
- OpenAPI auth endpoint schemas/examples/headers updated first.
- SDK regeneration required in the same change to avoid interface drift.
- CI/generation checks remain authoritative.

Rationale: consumers depend on generated clients; contract changes without regen create immediate breakage.

## Risks / Trade-offs

- **[Risk] Breaking clients expecting `refresh_token` in JSON** -> Mitigation: explicit BREAKING marker in proposal/specs, updated examples, and SDK regeneration.
- **[Risk] Cookie not sent in misconfigured environments** -> Mitigation: explicit contract for `Secure`/`SameSite=None`/`Path`, settings documentation, and integration tests asserting `Set-Cookie` attributes.
- **[Risk] Ambiguity around logout auth source (bearer vs cookie)** -> Mitigation: choose one deterministic runtime rule and encode it in OpenAPI + tests.
- **[Risk] Replay-protection regressions during rotation rewrite** -> Mitigation: preserve existing revoked/reuse logic and add dedicated integration tests.

## Migration Plan

1. Update OpenAPI auth operations and auth response schema to cookie-based refresh transport.
2. Implement runtime changes in auth router/security/settings for cookie issuance, rotation, and expiry.
3. Update integration and contract tests for cookie attributes and canonical errors.
4. Regenerate SDKs from updated OpenAPI and run consistency checks.
5. Validate full test suite and coverage target before archive.

Rollback strategy: restore previous auth OpenAPI and router behavior from git if release issues appear; invalidate newly issued refresh cookies by rotating server-side refresh secrets/tables as needed.

## Open Questions

- Should `POST /auth/logout` require bearer access token, refresh cookie, or either? (proposal favors cookie-driven logout for enterprise web).
- Is cookie `Domain` explicitly configured in production environments or left unset for host-only scope?
- Do we preserve `refresh_token` in register response temporarily for compatibility, or enforce full removal for all auth success payloads now?
