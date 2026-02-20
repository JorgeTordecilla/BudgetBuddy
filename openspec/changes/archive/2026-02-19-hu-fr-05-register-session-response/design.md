## Context

BudgetBuddy already migrated login/refresh/logout to cookie-based refresh transport. Register is the remaining outlier: it returns `AuthResponse` with `refresh_token` in JSON. This creates two auth bootstrap patterns and leaks refresh token material in one path.

## Goals / Non-Goals

**Goals**
- Make register response shape consistent with login/refresh (`AuthSessionResponse`).
- Ensure register also sets hardened `bb_refresh` cookie on success.
- Remove register `refresh_token` examples from OpenAPI source and mirror.
- Keep canonical error mappings (`400/406/409`) unchanged.

**Non-Goals**
- No change to refresh-rotation/replay-protection logic.
- No change to login/refresh/logout behavior.
- No new auth endpoints.

## Decisions

### 1. Register success payload becomes AuthSessionResponse
`POST /auth/register` returns `user`, `access_token`, `access_token_expires_in`; no `refresh_token` field.

Rationale: uniform frontend contract across auth bootstrap endpoints.

### 2. Register issues refresh cookie at creation time
On successful register, backend sets `bb_refresh` with same hardened attributes used by login/refresh (`HttpOnly`, `Secure`, `SameSite=None`, `Path=/api/auth`, `Max-Age`).

Rationale: keep refresh token out of JS-visible JSON and preserve security posture.

### 3. Test setup must bootstrap from cookie, not body
Integration and contract tests that currently consume `register.json()["refresh_token"]` must parse `Set-Cookie` and use that token for `/auth/refresh` and `/auth/logout` flow checks.

Rationale: tests must represent the new transport semantics.

## Risks / Trade-offs

- **Breaking contract risk**: clients parsing register `refresh_token` will fail.
  - Mitigation: clearly document in proposal/spec and examples.
- **Test churn**: many helpers currently assume register body contains refresh token.
  - Mitigation: centralize cookie parsing helper and replace call sites.

## Migration Plan

1. Update register runtime handler to return session payload and set refresh cookie.
2. Update OpenAPI `/auth/register` 201 schema + examples in source and mirror.
3. Update integration + contract tests for cookie-based register flow.
4. Run full test suite + coverage + OpenSpec verify.

Rollback: restore previous register response schema (`AuthResponse`) and body examples, and revert tests to body-based refresh token bootstrap.
