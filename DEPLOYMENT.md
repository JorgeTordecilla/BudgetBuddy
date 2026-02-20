# Deployment Configuration

## Fail-Fast Policy

The application validates critical runtime configuration during startup.
If required settings are missing or unsafe, startup fails with a clear error message and the process exits.

## Required Variables

- `DATABASE_URL`
- `JWT_SECRET`

## Cookie/Auth Variables

Refresh-cookie settings are validated at startup:

- `REFRESH_COOKIE_NAME`
- `REFRESH_COOKIE_PATH`
- `REFRESH_COOKIE_SAMESITE`
- `REFRESH_COOKIE_SECURE`
- `REFRESH_COOKIE_DOMAIN` (optional)

Coherence rule:

- If `REFRESH_COOKIE_SAMESITE=none`, then `REFRESH_COOKIE_SECURE=true` is required.

## Environment Safety Rules

Runtime environment is read from `ENV` (fallback `APP_ENV`, default `development`).

When `ENV=production`:

- `DEBUG=true` is rejected.
- `BUDGETBUDDY_CORS_ORIGINS` must be explicitly configured and must not contain `*`.
- `REFRESH_COOKIE_SECURE` must be `true`.
- `REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_PATH`, `REFRESH_COOKIE_SAMESITE`, and `REFRESH_COOKIE_SECURE` must be explicitly set.

## Startup Logging

Startup emits a `config loaded` log with non-sensitive metadata (environment, debug flag, db scheme, CORS origin count, cookie security flags).

Secrets are never logged:

- `JWT_SECRET`
- raw token values
- credential material

## Health And Readiness Probes

Use infrastructure probes against the API-prefixed endpoints:

```bash
curl -i http://localhost:8000/api/healthz
curl -i http://localhost:8000/api/readyz
```

Expected behavior:

- `GET /api/healthz`: returns `200` when process is alive, without DB checks.
- `GET /api/readyz`: returns `200` when DB is reachable, otherwise `503`.

## Migrations Gate

Readiness can enforce schema head parity through `MIGRATIONS_STRICT`.

- Recommended: `MIGRATIONS_STRICT=true` in production.
- In strict mode, `/api/readyz` returns `503` when DB revision is not at Alembic head.

Deployment baseline:

```bash
alembic upgrade head
```

Mismatch diagnosis:

```bash
alembic current
alembic heads
```

Interpretation:

- `current == heads` (single head): schema is aligned.
- mismatch or missing revision metadata: readiness can fail in strict mode until migration state is fixed.
