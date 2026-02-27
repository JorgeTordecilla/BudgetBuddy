## 1. Environment Configuration Hardening

- [x] 1.1 Add `frontend/.env.example` with `VITE_API_BASE_URL`, `VITE_APP_ENV`, and optional `VITE_SENTRY_DSN`.
- [x] 1.2 Add `frontend/src/config/env.ts` as a single typed entrypoint for env reads.
- [x] 1.3 Update API client/config wiring to consume `env.ts` (no hardcoded localhost fallback in feature code).
- [x] 1.4 Verify all API calls still use `credentials: "include"` where session cookies are required.

## 2. Netlify SPA Routing

- [x] 2.1 Add Netlify SPA redirect rule via `frontend/public/_redirects` (or `frontend/netlify.toml`).
- [x] 2.2 Verify deep-link refresh works for `/app/dashboard`, `/app/transactions`, and `/app/budgets`.

## 3. Runtime Observability and Error UX

- [x] 3.1 Add global `ErrorBoundary` fallback with `Try again/Reload` UX.
- [x] 3.2 Add diagnostics state store for last request id and normalized error metadata.
- [x] 3.3 Integrate diagnostics updates into API error normalization/interceptor paths.
- [x] 3.4 Ensure 429 handling surfaces user guidance and `Retry-After` when provided.
- [x] 3.5 Add “Copy diagnostic info” action with safe payload fields only.

## 4. Production Session Documentation

- [x] 4.1 Add `frontend/README.md` section: "Production auth requirements".
- [x] 4.2 Document backend prerequisites: CORS allowlist, credentials=true, cookie flags (`HttpOnly`, `Secure`, `SameSite=None`).
- [x] 4.3 Document known risk: CSRF strategy is a follow-up item (not implemented in this HU).

## 5. Playwright Smoke Coverage

- [x] 5.1 Add Playwright setup (`playwright.config.ts`) and `npm run test:e2e` script.
- [x] 5.2 Add smoke test for login page load.
- [x] 5.3 Add smoke test for successful login and navigation to `/app/dashboard`.
- [x] 5.4 Add smoke test env contract (`E2E_BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`) and usage docs.

## 6. Verification

- [x] 6.1 Run `npm run test` in `frontend`.
- [x] 6.2 Run `npm run test:coverage` in `frontend` and keep coverage >= project threshold.
- [x] 6.3 Run `npm run build` in `frontend`.
- [x] 6.4 Run `npm run test:e2e` against configured target environment.
