## Summary

Harden rate limiting as a configurable policy layer for auth and heavy transaction endpoints, while preserving existing contract semantics under normal load.

## Endpoint Policy

- `POST /auth/login`: configurable per-minute threshold
- `POST /auth/refresh`: configurable per-minute threshold
- `POST /transactions/import`: configurable per-minute threshold
- `GET /transactions/export`: configurable per-minute threshold

## Configuration

Use environment-driven settings with deterministic defaults:

- `AUTH_LOGIN_RATE_LIMIT_PER_MINUTE`
- `AUTH_REFRESH_RATE_LIMIT_PER_MINUTE`
- `TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE`
- `TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE`
- shared window config (existing or explicit global value)

## Response Contract

When a request exceeds threshold:

- status: `429`
- media type: `application/problem+json`
- canonical ProblemDetails identity:
  - `type=https://api.budgetbuddy.dev/problems/rate-limited`
  - `title=Too Many Requests`
  - `status=429`
- include `Retry-After` header (seconds)

## Operational Telemetry

On each blocked request, emit structured `rate_limited` log entry with:

- `request_id`
- `method`
- `path`
- `identity_key` (sanitized limiter key)
- `retry_after`

No secret/token values should be logged.

## Testing Strategy

- Integration tests for each endpoint class (`login`, `refresh`, `import`, `export`):
  - under limit: existing behavior unchanged
  - over limit: canonical `429` + `Retry-After`
- Contract checks ensure OpenAPI includes `429` response mappings for import/export.
