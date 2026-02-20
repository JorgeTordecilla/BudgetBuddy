## Summary

Introduce two probe endpoints with distinct semantics:

- `healthz`: process liveness only.
- `readyz`: dependency readiness for serving traffic.

## Endpoint Semantics

### `GET /healthz`

- Returns `200` whenever the process is alive and can serve HTTP.
- Must not touch the database.
- Response shape: `{ "status": "ok", "version": "<api-version>" }`.

### `GET /readyz`

- Returns `200` only when the app is ready for normal traffic.
- Readiness checks:
  1. Database connectivity (required).
  2. Schema readiness (optional; controlled by future HU-OPS-03 integration).
- Returns `503` when any required readiness check fails.
- Response shape:
  - success: `{ "status": "ready", "version": "<api-version>", "checks": { "db": "ok", "schema": "ok|skip" } }`
  - failure: `{ "status": "not_ready", "version": "<api-version>", "checks": { "db": "fail|ok", "schema": "fail|skip|ok" } }`

## Header Behavior

Probe endpoints must preserve the existing global request-id behavior:

- Echo incoming `X-Request-Id` when provided.
- Generate one when absent.

## Version Source

`version` should come from the API contract metadata (current OpenAPI `info.version`) to avoid divergence.

## Backward Compatibility

- Existing `/api/health` may remain temporarily for compatibility.
- New probes become the canonical infra endpoints.
