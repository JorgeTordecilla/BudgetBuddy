## Why

Serving traffic with an out-of-date schema is an operational risk and can produce runtime failures.
The readiness probe must represent not only database connectivity but also schema compatibility.

## What Changes

- Extend readiness behavior to support migration-gate checks.
- Add strict mode via `MIGRATIONS_STRICT` for environments that require schema parity before serving traffic.
- Make readiness output and logs explicit about current and head migration revisions.
- Document deployment baseline (`alembic upgrade head`) and mismatch diagnostics.

## Impact

- Reduces incidents caused by app/schema drift during deploys and rollbacks.
- Improves operator visibility during readiness failures.
- Keeps flexibility for non-strict local/dev workflows.
