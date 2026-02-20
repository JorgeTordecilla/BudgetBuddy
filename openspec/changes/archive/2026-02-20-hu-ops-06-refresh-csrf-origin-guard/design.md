## Summary

Introduce a focused anti-CSRF origin gate for cookie-based refresh calls while preserving existing refresh-token validation and rotation behavior.

## Scope

- Endpoint: `POST /auth/refresh`
- Trigger condition: refresh cookie transport is effectively cross-site (`SameSite=None`)
- Out of scope: full double-submit CSRF token flow (can be added later as an extension)

## Origin Guard Behavior

1. Evaluate guard only for refresh endpoint.
2. If `Origin` header is present:
   - allow only exact matches from configured allowed origins
   - reject otherwise with canonical `403` ProblemDetails
3. If `Origin` header is absent:
   - apply `AUTH_REFRESH_MISSING_ORIGIN_MODE`
   - `deny`: reject with canonical `403`
   - `allow_trusted`: continue normal refresh flow

## Configuration

- `AUTH_REFRESH_ALLOWED_ORIGINS` (CSV)
  - default: `BUDGETBUDDY_CORS_ORIGINS`
- `AUTH_REFRESH_MISSING_ORIGIN_MODE` (`deny` or `allow_trusted`)
  - recommended default in production: `deny`
- Guard is intended for cross-site cookie model and should align with existing cookie/cors settings.

## Error Mapping

Blocked origin decisions return canonical `application/problem+json`:

- status: `403`
- type: `https://api.budgetbuddy.dev/problems/origin-not-allowed`
- title: `Forbidden`
- detail: sanitized, non-sensitive reason (for example, origin not allowed)

## Test Strategy

- Allowed origin request succeeds (`200`) with normal refresh behavior.
- Disallowed origin is rejected (`403`) with canonical ProblemDetails.
- Missing origin is rejected in `deny` mode.
- Missing origin is accepted in `allow_trusted` mode.
- Existing cookie-invalid path remains canonical `401`.
