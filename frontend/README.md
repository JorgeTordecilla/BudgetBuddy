# BudgetBuddy Frontend

## Environment Variables

Use `.env.example` as the baseline.

- `VITE_API_BASE_URL`: Backend API base URL (must include `/api`).
- `VITE_APP_ENV`: `development | staging | production`.
- `VITE_RELEASE`: Release identifier (commit SHA or tag).
- `VITE_SENTRY_DSN` (optional): Sentry DSN for runtime error reporting.
- Optional feature flags: `VITE_FEATURE_IMPORT`, `VITE_FEATURE_AUDIT`.

## Netlify Production Checklist

1. Set Netlify environment variables:
   - `VITE_API_BASE_URL=/api`
   - `VITE_APP_ENV=production`
   - `NETLIFY_API_PROXY_TARGET=https://<your-render-service>/api`
   - optional `VITE_SENTRY_DSN`
2. Ensure Netlify config is versioned:
   - `netlify.toml` defines build/publish, SPA redirect, and security headers.
   - `/api/*` proxy target is injected at build time from `NETLIFY_API_PROXY_TARGET`.
   - Legacy fallback remains compatible via `public/_redirects`.
3. Validate deep-link refresh:
   - `/app/dashboard`
   - `/app/transactions`
   - `/app/budgets`
4. Validate release metadata:
   - `VITE_RELEASE` is set from CI (commit SHA/tag).

## Production Auth Requirements

For refresh-cookie cross-site auth to work, backend configuration must satisfy:

- CORS origin allowlist includes the Netlify frontend domain.
- `Access-Control-Allow-Credentials: true`.
- Refresh cookie flags:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` (when using Netlify `/api` same-origin proxy strategy)
  - `Domain` omitted (host-only cookie)

Frontend behavior:

- Requests include `credentials: "include"` for cookie transport.
- Protected API calls include `Authorization: Bearer <access_token>`.

## Release Checklist (Operator)

1. Confirm Netlify env vars:
   - `VITE_API_BASE_URL`
   - `VITE_APP_ENV=production`
   - `VITE_RELEASE=<sha-or-tag>`
   - optional: `VITE_SENTRY_DSN`, feature flags
2. Confirm CI quality checks are green:
   - `lint`, `test`, `test:coverage`, `build`
3. Confirm smoke checks:
   - login
   - `/app/dashboard`
   - `/app/analytics`
   - logout
4. Confirm deep-link routing from browser refresh on `/app/*`.
5. Confirm error correlation:
   - `ProblemDetails` + `X-Request-Id` visible in UI error surfaces.
6. Rollback pointer:
   - redeploy previous Netlify release and restore prior env values.
7. Use detailed checklist:
   - `docs/release-checklist.md`

## Troubleshooting

1. Check request id:
   - UI error surfaces show `X-Request-Id` when available.
   - Global fallback allows copying diagnostics (`request_id`, `problem_type`, `path`, `timestamp`).
2. Check ProblemDetails:
   - API errors are expected as `application/problem+json`.
   - Verify `type`, `title`, `status`, `detail`.
3. Check rate limits:
   - On `429`, UI shows retry guidance and `Retry-After` when provided.
4. Cross-site cookie mismatch:
   - verify backend allowlist contains the exact Netlify origin
   - verify `Access-Control-Allow-Credentials: true`
   - verify refresh cookie has `HttpOnly; Secure; SameSite=Lax; Path=/api/auth`
   - verify `REFRESH_COOKIE_DOMAIN` is empty/unset
   - after changing cookie env vars in Render, restart the service.
5. Telemetry redaction:
   - frontend observability sends allowlisted metadata only
   - tokens, cookies, and credential payloads are not reported.

## Security Note

Cross-site refresh cookies reduce token exposure in JavaScript, but CSRF strategy is still a dedicated follow-up decision and is **not implemented by this HU**.

## E2E Smoke

Required env vars:

- `E2E_BASE_URL` (optional locally, required for deploy-preview smoke)
- `E2E_USERNAME`
- `E2E_PASSWORD`

Run:

```bash
npm run test:e2e
```

## CI Release Controls

Workflow: `.github/workflows/frontend-ci.yml`

- `quality` job: lint + unit tests + coverage + build.
- `smoke-preview` job: login-page smoke on frontend changes.
- `smoke-production-gate` job (`main` only): blocks promotion if authenticated smoke fails.
