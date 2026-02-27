## Why

Frontend behavior in development is not enough to guarantee production operability on Netlify. We need deterministic deployment/routing, cross-site auth compatibility, observability metadata, and release gates so production issues are diagnosable and broken releases are blocked early.

## What Changes

- Add production deployment requirements for Netlify (SPA routing, publish/build contract, environment contract).
- Standardize frontend runtime environment variables for production (`VITE_API_BASE_URL`, `VITE_APP_ENV`, `VITE_RELEASE`, optional feature flags).
- Extend observability requirements to include runtime errors + API ProblemDetails context with `X-Request-Id` correlation.
- Define security-header baseline for Netlify-hosted frontend responses.
- Define release controls with CI gates and smoke-test requirements for auth/navigation critical paths.
- Define explicit compatibility validation for cross-site cookie + bearer auth flows.

## Capabilities

### New Capabilities
- `frontend-release-controls`: CI/release guardrails, smoke-gate policy, and release traceability requirements.

### Modified Capabilities
- `frontend-deploy-routing`: expand from SPA redirects to full Netlify production deployment + security-header requirements.
- `frontend-runtime-configuration`: add production env contract (`VITE_RELEASE`, feature flags, strict API base-url handling).
- `frontend-error-ux`: add observability enrichment rules (ProblemDetails + `X-Request-Id` + endpoint context forwarding).
- `frontend-e2e-smoke`: extend smoke criteria to production-readiness journeys (login/dashboard/analytics/logout).
- `frontend-session-lifecycle`: add explicit cross-site production compatibility validation requirements.

## Impact

- Affected frontend config and deploy assets: `frontend/netlify.toml` or `frontend/public/_redirects`, env handling modules, CI workflow files.
- Affected frontend observability integration: error capture/bootstrap modules and API client metadata propagation.
- Affected QA/release process: smoke test scope and deployment gates in CI.
- No backend contract additions required; this change validates and enforces compatibility with existing auth/cors/cookie contract.
