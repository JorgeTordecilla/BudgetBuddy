# Frontend Release Checklist

## Environment

- [ ] `VITE_API_BASE_URL=/api` (Netlify proxy path).
- [ ] `VITE_APP_ENV=production`.
- [ ] `NETLIFY_API_PROXY_TARGET=https://<render-service>/api`.
- [ ] `VITE_RELEASE` is set to commit SHA or tag.
- [ ] Optional flags and telemetry DSN values are set intentionally.

## Netlify Deploy

- [ ] `netlify.toml` is present and includes build/publish configuration.
- [ ] API proxy rule is present and ordered before SPA fallback:
      `/api/* -> API_PROXY_TARGET/:splat (200, force=true)`.
- [ ] Build-time substitution resolved `API_PROXY_TARGET` using `NETLIFY_API_PROXY_TARGET`.
- [ ] SPA redirect fallback is active (`/* -> /index.html 200`).
- [ ] Security headers are active (`nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP baseline).

## Cross-Site Auth Compatibility

- [ ] Login from deployed frontend sets `bb_refresh` cookie.
- [ ] Refresh rotates cookie and keeps session active.
- [ ] Backend CORS allowlist contains exact Netlify origin.
- [ ] Backend sends `Access-Control-Allow-Credentials: true`.
- [ ] Render env `REFRESH_COOKIE_SAMESITE=lax`.
- [ ] Render env `REFRESH_COOKIE_DOMAIN` is empty/unset.
- [ ] Render env `AUTH_REFRESH_MISSING_ORIGIN_MODE=allow_trusted` remains unchanged.
- [ ] Refresh cookie attributes are `HttpOnly; Secure; SameSite=Lax`.
- [ ] Render service was restarted after cookie env changes.

## Quality Gates

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run test:e2e`

## Observability

- [ ] Runtime/API failures include release and environment metadata.
- [ ] ProblemDetails telemetry includes allowlisted fields only (`type`, `title`, `status`, request id, method/path).
- [ ] No token, cookie, or credential payload is emitted.

## Rollback

- [ ] Previous Netlify deploy is identified.
- [ ] Rollback owner and command path are documented in release notes.
