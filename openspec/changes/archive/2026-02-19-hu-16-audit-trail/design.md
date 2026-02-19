## Context

BudgetBuddy is a contract-first FastAPI backend with canonical media-type and ProblemDetails behavior. Current domain mutations (accounts/categories/transactions/auth session events) do not leave a durable operational trail, which limits incident response, support diagnostics, and security investigations.

This change adds an internal audit trail with low overhead and deterministic behavior. The design must preserve existing API contract behavior, avoid leaking secrets, and remain compatible with SQLite tests and Postgres production.

Constraints:
- Preserve existing endpoint success/error semantics and media types.
- Keep canonical ProblemDetails handling for new `/audit` query errors.
- Avoid persisting secrets (refresh tokens, bearer tokens, password material).
- Keep write-path overhead minimal and predictable.

## Goals / Non-Goals

**Goals:**
- Persist audit events for key mutation actions: create/update/archive/restore/logout/token-reuse.
- Record normalized fields: `request_id`, `user_id`, `resource_type`, `resource_id`, `action`, `created_at`.
- Add owner-scoped query endpoint `GET /audit` with cursor pagination and canonical errors.
- Ensure sensitive-data redaction by design (no token payload persistence).
- Keep implementation aligned with OpenAPI and existing ProblemDetails taxonomy.

**Non-Goals:**
- Full SIEM or centralized cross-service audit pipeline.
- Audit diff snapshots of full resource payloads.
- Administrative cross-user audit search in this change.
- Rewriting existing domain authorization model.

## Decisions

1. Introduce a dedicated `AuditEvent` model/table
- Decision: Add a first-class `AuditEvent` persistence model with immutable event rows.
- Rationale: Durable, queryable, and decoupled from domain tables.
- Alternative: Log-only files/STDOUT parsing. Rejected due to weak queryability and retention control.

2. Use explicit event envelope, no arbitrary payload blob by default
- Decision: Store fixed columns (`request_id`, `user_id`, `resource_type`, `resource_id`, `action`, `created_at`) and keep optional metadata strictly curated/sanitized.
- Rationale: Prevents accidental secret leakage and simplifies indexing.
- Alternative: Store raw request/response payloads. Rejected for security and compliance risk.

3. Emit audit events inside application service/router mutation paths
- Decision: Emit after successful mutation commits for create/update/archive/restore/logout; emit security events (token reuse) at detection points.
- Rationale: Aligns event semantics with actual state changes and security signals.
- Alternative: DB triggers for all tables. Rejected for reduced app-level context and harder cross-flow auth event coverage.

4. Add repository-backed audit writer abstraction
- Decision: Introduce an `AuditEventRepository` interface + SQLAlchemy implementation and lightweight helper `emit_audit_event(...)`.
- Rationale: Keeps write logic consistent and testable; future async/batch writes remain possible.
- Alternative: Inline inserts in each route. Rejected due to duplication and drift risk.

5. Query API is owner-scoped and paginated
- Decision: Add `GET /audit?from&to&cursor&limit` restricted to authenticated user events; use deterministic cursor ordering `created_at DESC, id DESC`.
- Rationale: Consistent with existing list endpoint paging rules and least-privilege access.
- Alternative: Offset pagination. Rejected due to instability under concurrent writes.

6. Preserve contract-first behavior and canonical errors
- Decision: Update OpenAPI for `/audit` and reuse canonical ProblemDetails for `400` invalid cursor/date range, `401`, `403`, `406`.
- Rationale: Maintains existing client expectations and testing patterns.
- Alternative: ad-hoc error payloads/statuses. Rejected as contract drift.

7. Security redaction policy is enforced centrally
- Decision: Audit emission helper applies denylist/redaction rules; token-like values are never persisted.
- Rationale: Ensures consistent enforcement across all emitters.
- Alternative: per-callsite manual redaction. Rejected due to high omission risk.

## Risks / Trade-offs

- [Write overhead on hot mutation paths] -> Mitigation: fixed-size rows, indexed queries, minimal serialization, single insert per action.
- [Event gaps if emit path is skipped] -> Mitigation: central helper usage, integration tests per key action class.
- [Secret leakage via optional metadata] -> Mitigation: strict allowlist/denylist and tests asserting no token persistence.
- [Pagination drift under concurrent writes] -> Mitigation: deterministic cursor key and canonical invalid-cursor handling, matching existing pagination conventions.
- [Schema growth over time] -> Mitigation: normalized action/resource enums and additive migration strategy.

## Migration Plan

1. Add `AuditEvent` model + migration and create composite index `(user_id, created_at)`.
2. Add repository/storage layer and emission helper with redaction safeguards.
3. Wire emission into accounts/categories/transactions/auth mutation and token-reuse paths.
4. Add `/audit` router endpoint with owner scoping, filters, and cursor pagination.
5. Extend OpenAPI (`backend/openapi.yaml`) and mirror spec (`openspec/specs/openapi.yaml`).
6. Add integration/contract tests for event creation, redaction, pagination, and canonical errors.
7. Run full tests + coverage gate (`>= 90%`).

Rollback:
- Disable audit emission calls and `/audit` route exposure behind configuration toggle if needed.
- Revert migration in controlled rollback window (data loss accepted only for audit table).

## Open Questions

- Should event `action` be a constrained enum in DB now, or string with application-level validation first?
- Should `/audit` include optional `action`/`resource_type` filters in V1, or keep only `from/to/cursor/limit`?
- For token-reuse events, should `resource_id` reference refresh token row id (internal) or user id only to avoid sensitive linkage?
