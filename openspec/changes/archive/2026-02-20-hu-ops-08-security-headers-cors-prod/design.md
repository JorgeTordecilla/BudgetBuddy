## Summary

Introduce a centralized security-header middleware and keep CORS policy environment-driven with explicit production constraints.

## Header Policy

Apply the following headers on API responses (success and error paths):

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Opener-Policy: same-origin` (if compatible with current API usage)
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`

## CORS Policy

- Keep `allow_credentials=true`.
- Use strict `allow_origins` from environment list.
- Keep exposed headers minimal:
  - `X-Request-Id`
  - `Retry-After`
- Maintain existing explicit methods and allowed request headers.

## Configuration and Safety

- Production must continue rejecting wildcard origins.
- Header policy should be deterministic and not depend on endpoint-specific branching.

## Testing Strategy

- Integration test for baseline security headers on representative endpoints (`/api/healthz`, one authenticated endpoint, one error response).
- Integration test for allowed vs disallowed origin CORS behavior.
- Contract/doc checks for exposed headers and security-policy documentation.
