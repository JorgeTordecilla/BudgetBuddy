## Summary

Create an operator-focused deployment runbook that is executable end-to-end and includes explicit rollback branches.

## Source Of Truth

Use root `DEPLOYMENT.md` as the canonical runbook.
If other deployment docs exist, they should link to or align with the canonical runbook to avoid drift.

## Runbook Structure

1. **Prechecks**
   - required environment variables
   - DB reachability and readiness (`/api/readyz`)
   - migration mode awareness (`MIGRATIONS_STRICT`)
2. **Deploy**
   - rollout application artifact
   - run `alembic upgrade head`
   - verify readiness
3. **Smoke Test (<=5 minutes)**
   - health checks (`/api/healthz`, `/api/readyz`)
   - auth login request
   - authenticated `/api/me` request with access token
4. **Rollback**
   - app rollback to previous version
   - schema rollback when reversible
   - non-reversible migration fallback (backup/restore)
5. **Post-incident validation**
   - re-run smoke test
   - confirm revision and readiness status

## Rollback Branches

### Reversible migration path

- Use Alembic downgrade to known previous revision.
- Confirm readiness and smoke tests after downgrade.

### Non-reversible migration path

When migration cannot be safely downgraded:

- stop/limit writes
- restore DB snapshot/backup
- deploy compatible app version
- verify with readiness + smoke test

## Operational Constraints

- Commands should be copy-pasteable.
- Expected outcomes/status codes should be documented.
- Procedure must avoid exposing secrets in logs or shared output.
