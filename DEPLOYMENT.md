# Deployment Runbook

This file is the canonical deployment and rollback runbook.
If other deployment notes exist, they should reference this document.

## 1. Prechecks (Before Deploy)

### 1.1 Required environment

Verify critical configuration is present and safe:

- `DATABASE_URL`
- `JWT_SECRET`
- `ENV` / `APP_ENV`
- `BUDGETBUDDY_CORS_ORIGINS`
- `REFRESH_COOKIE_NAME`
- `REFRESH_COOKIE_PATH`
- `REFRESH_COOKIE_SAMESITE`
- `REFRESH_COOKIE_SECURE`
- `MIGRATIONS_STRICT` (recommended `true` in production)

Fail-fast rules already enforced by startup:

- `ENV=production` rejects `DEBUG=true`
- `BUDGETBUDDY_CORS_ORIGINS` must not contain `*` in production
- `REFRESH_COOKIE_SAMESITE=none` requires `REFRESH_COOKIE_SECURE=true`

### 1.2 Connectivity and readiness

Assuming API base URL is `http://localhost:8000`:

```bash
curl -i http://localhost:8000/api/healthz
curl -i http://localhost:8000/api/readyz
```

Expected:

- `/api/healthz` -> `200`
- `/api/readyz` -> `200` if DB and (when strict) migration state are ready

## 2. Deploy Procedure

### 2.1 Apply application release

Deploy the target app version/image using your platform workflow.

### 2.2 Apply migrations

From `backend/`:

```bash
.venv\Scripts\python.exe -m alembic upgrade head
```

Expected:

- Alembic exits successfully.
- Running `alembic current` afterwards points to head revision.

### 2.3 Post-deploy readiness check

```bash
curl -i http://localhost:8000/api/readyz
```

Expected:

- `200` with `status=ready`.
- `503` means do not continue rollout traffic.

## 3. 5-Minute Smoke Test

Goal: reproducible minimal validation within ~5 minutes.

### 3.1 Health and readiness

```bash
curl -i http://localhost:8000/api/healthz
curl -i http://localhost:8000/api/readyz
```

### 3.2 Auth login and `/me`

Use an existing test user and avoid printing secrets in shared logs.

```bash
curl -s -X POST http://localhost:8000/api/auth/login ^
  -H "accept: application/vnd.budgetbuddy.v1+json" ^
  -H "content-type: application/vnd.budgetbuddy.v1+json" ^
  -d "{\"username\":\"<USERNAME>\",\"password\":\"<PASSWORD>\"}" > login.json
```

Extract `access_token` from `login.json`, then:

```bash
curl -i http://localhost:8000/api/me ^
  -H "accept: application/vnd.budgetbuddy.v1+json" ^
  -H "authorization: Bearer <ACCESS_TOKEN>"
```

Expected:

- Login returns `200`.
- `/api/me` returns `200` with authenticated user payload.

## 4. Rollback Strategy

Always start by rolling back application version/image to the last known-good release.

### 4.1 Reversible migration path

If the latest migration is reversible:

```bash
.venv\Scripts\python.exe -m alembic downgrade -1
```

Or downgrade to a known revision:

```bash
.venv\Scripts\python.exe -m alembic downgrade <REVISION_ID>
```

Then run:

```bash
.venv\Scripts\python.exe -m alembic current
curl -i http://localhost:8000/api/readyz
```

### 4.2 Non-reversible migration path

If downgrade is not available/safe:

1. Stop or restrict writes.
2. Restore DB from last good snapshot/backup.
3. Redeploy compatible app version.
4. Re-run readiness and smoke test.

## 5. Downgrade vs Restore Decision Guide

Use `alembic downgrade` when:

- Migration has safe reverse operations.
- Data-loss risk is understood and acceptable.

Use backup/snapshot restore when:

- Migration is marked/known as non-reversible.
- Reverse DDL/data transform is unsafe or undefined.
- Incident severity requires fastest full-state recovery.

## 6. Migration Mismatch Diagnostics

From `backend/`:

```bash
.venv\Scripts\python.exe -m alembic current
.venv\Scripts\python.exe -m alembic heads
```

Interpretation:

- `current == heads` (single head) -> schema aligned.
- mismatch -> schema drift; in strict mode, readiness may stay `503`.
- missing revision metadata/errors -> treat as non-ready until resolved.

## 7. Log Safety

When sharing command output, redact:

- `JWT_SECRET`
- passwords
- raw bearer/refresh tokens
- full DB credentials in `DATABASE_URL`
