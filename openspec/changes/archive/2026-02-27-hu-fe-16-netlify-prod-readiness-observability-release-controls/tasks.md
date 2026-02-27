## 1. Netlify Deployment Hardening

- [x] 1.1 Add/normalize Netlify config for SPA build/publish and deep-link routing fallback.
- [x] 1.2 Add baseline security headers in Netlify config (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP baseline).
- [x] 1.3 Validate deep-link behavior for `/app/*` routes on preview deployment.

## 2. Runtime Environment Contract

- [x] 2.1 Extend centralized env module and `.env.example` with production keys (`VITE_RELEASE`, optional `VITE_FEATURE_*`, telemetry key contract).
- [x] 2.2 Ensure API client/runtime code consumes only centralized env values (no hardcoded backend URL paths).
- [x] 2.3 Document production env requirements for Netlify and release operations.

## 3. Observability and Correlation

- [x] 3.1 Integrate production observability bootstrap (Sentry or equivalent) behind env-driven enablement.
- [x] 3.2 Enrich captured API/runtime errors with allowlisted metadata (`problem.type/title/status`, `x-request-id`, method/path, release/environment).
- [x] 3.3 Enforce redaction policy so tokens/cookies/credential payloads are never emitted to telemetry.

## 4. Release Controls and Smoke Gates

- [x] 4.1 Add/update CI workflow for frontend release checks (`lint`, `test`, `build`, smoke).
- [x] 4.2 Extend smoke suite to cover login -> dashboard -> analytics -> logout critical flow.
- [x] 4.3 Configure promotion gate policy so smoke failures block production promotion.

## 5. Cross-site Auth Compatibility Validation

- [x] 5.1 Add explicit release checklist verification for cookie-refresh compatibility from hosted frontend origin.
- [x] 5.2 Validate `credentials: include` session endpoints and bearer behavior for protected requests.
- [x] 5.3 Add troubleshooting guidance for origin allowlist/cookie attribute mismatch in production.

## 6. Verification

- [x] 6.1 Run frontend quality gates: `npm run test`, `npm run test:coverage`, `npm run build`.
- [x] 6.2 Run smoke tests in CI-compatible mode (Playwright or existing e2e command).
- [ ] 6.3 Verify deployment checklist manually on Netlify preview and production candidate (deep-link routing, refresh flow, observability event correlation).
