## Why

The frontend currently works in local development but is not fully hardened for production deployment on Netlify. We need deterministic environment configuration, SPA deep-link routing, baseline runtime observability, and smoke tests so deploys are stable and diagnosable.

## What Changes

- Add environment contract for frontend runtime (`VITE_API_BASE_URL`, `VITE_APP_ENV`, optional `VITE_SENTRY_DSN`) with a single typed config entrypoint.
- Add Netlify SPA fallback routing so deep links under `/app/*` do not 404 on hard refresh.
- Add production-auth documentation for cross-site refresh-cookie behavior and backend requirements.
- Add global runtime error boundary and diagnostics surface (last request id, problem type, path, timestamp).
- Extend ProblemDetails/429 UX handling to expose retry guidance consistently.
- Add Playwright smoke coverage for login and baseline authenticated navigation.

## Capabilities

### New Capabilities
- `frontend-runtime-configuration`: Environment-driven frontend runtime config and API base URL usage.
- `frontend-deploy-routing`: Netlify SPA deep-link routing behavior for frontend deploys.
- `frontend-e2e-smoke`: Baseline browser smoke coverage for production/deploy-preview readiness.

### Modified Capabilities
- `frontend-error-ux`: Add global ErrorBoundary + diagnostics copy flow and 429 retry guidance behavior.
- `frontend-session-lifecycle`: Add production auth requirements documentation for cross-site cookie sessions.

## Impact

- Affected code and docs:
  - `frontend/src/config/*`
  - `frontend/src/api/client.ts`
  - `frontend/src/errors/*`
  - `frontend/src/state/*`
  - `frontend/src/main.tsx` (root wiring)
  - `frontend/.env.example`
  - `frontend/public/_redirects` or `frontend/netlify.toml`
  - `frontend/README.md`
  - `frontend/playwright.config.ts`
  - `frontend/tests/smoke.spec.ts`
  - `frontend/package.json` scripts
- Backward compatibility:
  - No backend contract changes.
  - Frontend behavior remains compatible with existing auth/session flow.
