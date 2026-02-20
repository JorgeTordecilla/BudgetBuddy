## Why

The API is consumed by browser clients in cross-site production scenarios.  
We need deterministic CORS behavior and baseline security headers to reduce browser attack surface and improve operational consistency.

## What Changes

- Harden CORS policy for production:
  - strict allowlist by environment configuration
  - `allow_credentials=true`
  - minimal exposed headers (`X-Request-Id`, `Retry-After`)
- Add baseline response security headers for API endpoints:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Cross-Origin-Opener-Policy` (if applicable)
  - baseline `Content-Security-Policy` for API responses
- Document enforced headers and CORS behavior.
- Add integration tests for header presence and CORS behavior.

## Impact

- Better default browser-facing security posture for production.
- Lower chance of permissive CORS drift over time.
- Deterministic, test-backed response header behavior.
