## 1. Data Model and Persistence

- [x] 1.1 Add `AuditEvent` SQLAlchemy model/table with normalized fields: `request_id`, `user_id`, `resource_type`, `resource_id`, `action`, `created_at`.
- [x] 1.2 Create and apply migration for `audit_events` table.
- [x] 1.3 Add composite index on `(user_id, created_at)` and verify query plan is index-backed for user timeline reads.
- [x] 1.4 Add repository/interface support for writing and listing audit events.

## 2. Runtime Emission Wiring

- [x] 2.1 Implement centralized audit emit helper/service to keep event writes consistent across modules.
- [x] 2.2 Emit events for account mutation actions (create/update/archive).
- [x] 2.3 Emit events for category mutation actions (create/update/archive/restore).
- [x] 2.4 Emit events for transaction mutation actions (create/update/archive/restore).
- [x] 2.5 Emit auth audit events for `logout` success and refresh-token reuse detection.
- [x] 2.6 Ensure event writes are low-overhead (single normalized insert per action) and do not alter existing endpoint outcomes.

## 3. Sensitive Data Safety

- [x] 3.1 Add redaction/validation rules so audit persistence never stores bearer tokens, refresh tokens, passwords, or secret-like values.
- [x] 3.2 Ensure auth/security audit events preserve actionable context (`request_id`, actor, action, resource/time) without storing sensitive artifacts.
- [x] 3.3 Add defensive tests/guards for token-like value leakage in audit payload fields.

## 4. Audit Query API (Owner-Only)

- [x] 4.1 Add `GET /audit?from&to&cursor&limit` endpoint scoped to authenticated owner events only.
- [x] 4.2 Implement deterministic cursor pagination ordering (`created_at DESC, id DESC`) and `next_cursor` behavior.
- [x] 4.3 Enforce canonical `400` for invalid cursor and invalid date range (`from > to`).
- [x] 4.4 Enforce canonical `401/403/406` behavior and media-type negotiation consistency.

## 5. OpenAPI and Contract Sync

- [x] 5.1 Extend `backend/openapi.yaml` with `/audit` path, query parameters, and response mappings.
- [x] 5.2 Add/extend reusable audit schemas in OpenAPI components (audit item/list response + pagination shape).
- [x] 5.3 Ensure `components/x-problem-details-catalog` coverage remains canonical for audit query errors.
- [x] 5.4 Mirror all OpenAPI updates to `openspec/specs/openapi.yaml`.

## 6. Tests

- [x] 6.1 Add integration tests asserting audit events are created for key account/category/transaction mutation actions.
- [x] 6.2 Add integration tests asserting auth audit events for logout and refresh-token reuse detection.
- [x] 6.3 Add integration tests for `GET /audit` happy path, owner-only isolation, and deterministic pagination.
- [x] 6.4 Add integration tests for canonical audit query errors (`400 invalid cursor/date-range`, `401`, `403`, `406`).
- [x] 6.5 Add tests proving sensitive fields are not persisted in audit events.
- [x] 6.6 Add/adjust contract tests to verify OpenAPI `/audit` mappings and schema references.

## 7. Verification

- [x] 7.1 Run full backend test suite from `backend` using `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest`.
- [x] 7.2 Run coverage gate from `backend` using `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`.
- [x] 7.3 Confirm total `app` coverage remains `>= 90%`.
- [x] 7.4 Verify no regressions in existing auth/account/category/transaction flows outside audit side effects.
