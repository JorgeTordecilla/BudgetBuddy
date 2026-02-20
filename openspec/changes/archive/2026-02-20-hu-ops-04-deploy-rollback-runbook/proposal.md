## Why

Deploying without a clear operational runbook increases incident risk and recovery time.
Operators need a deterministic sequence for prechecks, migration, smoke tests, and rollback.

## What Changes

- Consolidate deployment guidance into a single canonical runbook in `DEPLOYMENT.md`.
- Define prechecks (required env + database connectivity/readiness).
- Define deploy path including `alembic upgrade head`.
- Define a reproducible 5-minute smoke test (auth login + `/me` + probes).
- Define rollback strategies for:
  - reversible migrations (`alembic downgrade`)
  - non-reversible migrations (backup/restore process)

## Impact

- Reduces deployment uncertainty and mean-time-to-recovery.
- Establishes a standard incident-response path for schema/app mismatches.
- Improves operator confidence with repeatable smoke checks.
