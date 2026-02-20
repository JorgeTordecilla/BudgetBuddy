## Why

Platform orchestrators need standard liveness and readiness probes to route traffic safely.
Current API has a health endpoint, but it does not separate process liveness from dependency readiness.

## What Changes

- Add `GET /healthz` as a pure liveness probe that never checks the database.
- Add `GET /readyz` as a readiness probe that checks database connectivity and, optionally, migration/schema readiness.
- Standardize probe response payload with `status` and `version`.
- Ensure probe responses include `X-Request-Id` consistently.
- Document curl examples for both endpoints.

## Impact

- Improves deployment safety in Kubernetes/ECS-style environments.
- Makes load balancer behavior deterministic during startup, DB outages, and recovery.
- Introduces a clear extension point for HU-OPS-03 schema-readiness checks.
