## Context

Auth endpoints already emit `X-Request-Id` through global middleware. The contract currently under-documents this for login/refresh/logout, while other endpoints and recent `/me` work document it explicitly.

## Goals / Non-Goals

**Goals**
- Document `X-Request-Id` on login/refresh/logout responses in source and mirror OpenAPI.
- Add test coverage that proves header presence for these auth flows.
- Keep auth payload/cookie semantics unchanged.

**Non-Goals**
- No change to auth business logic or token rotation.
- No change to status codes, schemas, or ProblemDetails taxonomy.

## Decisions

### 1. Treat request-id as contract-visible for all auth responses
Add `X-Request-Id` header references to success and documented error responses on:
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### 2. Validate both contract and runtime behavior
- Contract tests assert OpenAPI mappings include the header.
- Integration tests assert the header is present in real responses.

## Risks / Trade-offs

- Low risk: documentation-only plus assertion updates.
- Minor maintenance: more response-header mappings to keep synchronized.

## Migration Plan

1. Update `backend/openapi.yaml` auth responses with `X-Request-Id` header refs.
2. Mirror in `openspec/specs/openapi.yaml`.
3. Update contract + integration tests.
4. Run tests and coverage.
