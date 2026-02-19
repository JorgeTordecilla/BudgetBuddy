## 1. Runtime Restore Behavior

- [x] 1.1 Implement transaction restore via `PATCH /transactions/{transaction_id}` when payload sets `archived_at=null`
- [x] 1.2 Ensure restore is idempotent: archived and already-active paths both return `200`
- [x] 1.3 Preserve existing ownership checks and canonical `403` behavior for non-owner access

## 2. Contract Alignment

- [x] 2.1 Update `backend/openapi.yaml` for transaction patch restore semantics (`200`, canonical `401/403/406`)
- [x] 2.2 Update `openspec/specs/openapi.yaml` mirror with same restore semantics
- [x] 2.3 Ensure success media type remains vendor JSON and errors remain problem JSON

## 3. Integration Tests

- [x] 3.1 Add test: archived transaction restore happy path (`200`, `archived_at=null`)
- [x] 3.2 Add test: restore idempotent on already-active transaction (`200`)
- [x] 3.3 Add test: restore by non-owner returns canonical `403`
- [x] 3.4 Add test: restore with unsupported `Accept` returns canonical `406`

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm all tests pass and coverage remains `>= 90%`
