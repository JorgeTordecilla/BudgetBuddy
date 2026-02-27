# BudgetBuddy Frontend

## Environment Variables

Use `.env.example` as the baseline.

- `VITE_API_BASE_URL`: Backend API base URL (must include `/api`).
- `VITE_APP_ENV`: `development | staging | production`.
- `VITE_SENTRY_DSN` (optional): Sentry DSN for runtime error reporting.

## Netlify Production Checklist

1. Set Netlify environment variables:
   - `VITE_API_BASE_URL=https://<your-api-domain>/api`
   - `VITE_APP_ENV=production`
   - optional `VITE_SENTRY_DSN`
2. Ensure SPA fallback routing exists:
   - `public/_redirects` includes `/* /index.html 200`
3. Validate deep-link refresh:
   - `/app/dashboard`
   - `/app/transactions`
   - `/app/budgets`

## Production Auth Requirements

For refresh-cookie cross-site auth to work, backend configuration must satisfy:

- CORS origin allowlist includes the Netlify frontend domain.
- `Access-Control-Allow-Credentials: true`.
- Refresh cookie flags:
  - `HttpOnly`
  - `Secure`
  - `SameSite=None`

Frontend behavior:

- Requests include `credentials: "include"` for cookie transport.
- Protected API calls include `Authorization: Bearer <access_token>`.

## Troubleshooting

1. Check request id:
   - UI error surfaces show `X-Request-Id` when available.
   - Global fallback allows copying diagnostics (`request_id`, `problem_type`, `path`, `timestamp`).
2. Check ProblemDetails:
   - API errors are expected as `application/problem+json`.
   - Verify `type`, `title`, `status`, `detail`.
3. Check rate limits:
   - On `429`, UI shows retry guidance and `Retry-After` when provided.

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
