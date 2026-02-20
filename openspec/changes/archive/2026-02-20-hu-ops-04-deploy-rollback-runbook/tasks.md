## 1. Runbook content

- [x] 1.1 Consolidate deployment guidance into canonical `DEPLOYMENT.md` (source-of-truth statement).
- [x] 1.2 Add prechecks section (env validation + DB connectivity/readiness checks).
- [x] 1.3 Add deploy section with explicit `alembic upgrade head`.
- [x] 1.4 Add a reproducible smoke test sequence (auth/login + `/me`) targetable within 5 minutes.

## 2. Rollback strategy

- [x] 2.1 Document rollback with reversible migrations (`alembic downgrade` to previous revision).
- [x] 2.2 Document non-reversible migration fallback (backup/snapshot restore procedure).
- [x] 2.3 Add decision guidance on when to choose downgrade vs restore path.

## 3. Diagnostics and operator UX

- [x] 3.1 Add quick diagnosis commands for migration/revision mismatches.
- [x] 3.2 Include expected status/outcomes for each runbook step.
- [x] 3.3 Ensure runbook avoids secret leakage in shared logs/output examples.

## 4. Verification

- [x] 4.1 Verify commands in runbook are syntactically valid and consistent with current endpoints.
- [x] 4.2 Validate OpenSpec change artifacts.
