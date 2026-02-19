## Context

Operational debugging needs a stable correlation key across success and error responses and enough log context to trace failures safely.

Current gap:
- request correlation is not explicit in the API contract,
- error logging fields are not standardized,
- detail sanitization policy is implicit.

## Goals / Non-Goals

**Goals**
- Ensure every HTTP response carries `X-Request-Id`.
- Ensure API error logs include `request_id`, `path`, `status`, `problem_type`.
- Ensure `ProblemDetails.detail` does not expose sensitive/internal data.
- Keep middleware overhead minimal.

**Non-Goals**
- Full distributed tracing system.
- External logging backend integration.
- Large refactor of routing/business logic.

## Decisions

- Decision: implement lightweight request-id middleware in `app.main`.
  - If incoming `X-Request-Id` is absent/empty, generate UUID4.
  - Store in request state and always write to response header.

- Decision: centralize API error logging in current error handler path.
  - Log structured fields (`request_id`, `path`, `status`, `problem_type`) at warning/error level.

- Decision: sanitize `detail` before serializing/logging ProblemDetails.
  - Strip or replace suspicious token-like fragments.
  - Never include stack traces.

## Risks / Trade-offs

- Over-sanitization may reduce debugging value in `detail`.
  -> Mitigation: keep canonical `type/title/status` and request-id for correlation.

- Middleware mistakes could miss headers on exceptional paths.
  -> Mitigation: enforce via integration tests on both success and error responses.

## Migration Plan

1. Add request-id middleware and propagation.
2. Update API error handling/logging with structured fields.
3. Add sanitization utility for `ProblemDetails.detail`.
4. Update OpenAPI docs for `X-Request-Id`.
5. Add integration tests and run full suite with coverage.

## Open Questions

- Should we enforce a max length/format validation for client-provided `X-Request-Id` or accept opaque values in v1?
