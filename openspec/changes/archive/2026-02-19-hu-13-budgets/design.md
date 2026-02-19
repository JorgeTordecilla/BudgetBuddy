## Context

BudgetBuddy currently supports authentication, ledger operations (accounts/categories/transactions), and analytics, but does not provide a persistent budget domain. The HU-13 change introduces monthly category budgets with strict ownership and conflict semantics, while preserving the existing contract-first workflow (`backend/openapi.yaml` as source, mirrored in `openspec/specs/openapi.yaml`), existing media types, and ProblemDetails conventions.

The implementation must work across Postgres (production) and SQLite (tests), enforce deterministic integer cents handling, and maintain existing endpoint behavior without regressions.

## Goals / Non-Goals

**Goals:**
- Add a first-class Budget domain model with fields: `id`, `user_id`, `category_id`, `month` (`YYYY-MM`), `limit_cents`, archival metadata, and timestamps.
- Expose budget CRUD/list endpoints with contract-compliant responses:
  - Success: `application/vnd.budgetbuddy.v1+json`
  - Errors: `application/problem+json`
- Enforce business invariants:
  - Budget month must match `YYYY-MM`
  - `(user_id, month, category_id)` is unique
  - Archived category cannot receive new/updated budgets
  - Ownership checks across all budget operations
- Extend analytics composition with budget context (`spent vs limit`) without changing money representation (integer cents only).
- Keep test coverage at or above 90% for `app` package.

**Non-Goals:**
- Implementing recurring/rollover budgets across months.
- Multi-currency budgets or decimal/fractional monetary storage.
- Redesigning existing analytics endpoint shapes beyond additive budget-aware fields.
- Reworking global auth/session architecture.

## Decisions

1. Introduce a dedicated `budgets` persistence model and module
- Decision: Add a dedicated router/service/repository flow for budgets instead of embedding budgets into categories or analytics storage.
- Rationale: Preserves separation of concerns, enables independent conflict handling (`409`), and keeps analytics as a consumer of domain data.
- Alternative considered: Storing budget fields directly in category records. Rejected because budgets are month-scoped, category fields are not.

2. Use normalized month key (`YYYY-MM`) validated at boundary
- Decision: Validate month format at API boundary and persist as canonical text key (`YYYY-MM`) with indexed query support.
- Rationale: Simple cross-database compatibility (Postgres + SQLite), easy range filtering, and explicit domain representation.
- Alternative considered: Persisting date (`YYYY-MM-01`) with DB functions for month extraction. Rejected due to added query complexity and cross-db formatting differences.

3. Enforce uniqueness with DB constraint plus service-level mapping
- Decision: Add a unique constraint on `(user_id, month, category_id)` and map violations to canonical `409` ProblemDetails.
- Rationale: DB-level invariants prevent race-condition duplicates; service-level mapping ensures stable API error contract.
- Alternative considered: Pre-check query only. Rejected because concurrent writes can bypass non-atomic checks.

4. Canonical error taxonomy for budgets
- Decision: Add budget-specific canonical ProblemDetails constants and reuse existing auth/negotiation/error middleware.
- Rationale: Keeps error responses deterministic and aligned with `problem-details-catalog`.
- Planned `409` conflict set:
  - `budget-duplicate`
  - `category-not-owned`
  - `category-archived`
- Planned validation failures (`400`) for malformed month and invalid `limit_cents` input shape/range.
- Alternative considered: generic conflict title/type for all 409 cases. Rejected because clients need actionable machine-readable conflict types.

5. Preserve contract-first and media-type behavior
- Decision: Update OpenAPI first for schemas/paths/responses and implement backend behavior to match it exactly.
- Rationale: Project governance requires OpenAPI alignment and explicit media type guarantees.
- Impacted OpenAPI paths:
  - `GET /budgets`
  - `POST /budgets`
  - `GET /budgets/{budget_id}`
  - `PATCH /budgets/{budget_id}`
  - `DELETE /budgets/{budget_id}`
- Impacted components:
  - `Budget`, `BudgetCreate`, `BudgetUpdate`, `BudgetListResponse`
  - ProblemDetails response references for `400/401/403/406/409`

6. Query and indexing strategy for list/range
- Decision: Add composite index on `(user_id, month)` and unique index/constraint on `(user_id, month, category_id)`.
- Rationale: Supports the expected query pattern (`GET /budgets?from&to`) and enforces domain uniqueness efficiently.
- Alternative considered: index on `month` only. Rejected due to poor tenant isolation/query selectivity.

## Risks / Trade-offs

- [Month stored as text key may limit advanced date arithmetic] -> Mitigation: scope month logic to strict `YYYY-MM` validation and lexical/range-safe comparisons; defer richer calendar semantics to future changes.
- [Conflict mapping can drift if DB exception handling changes] -> Mitigation: centralize exception-to-ProblemDetails translation for budget repository/service layer and cover with integration tests.
- [Analytics extension may introduce response drift] -> Mitigation: keep analytics changes additive and assert schema compatibility in tests against OpenAPI-defined responses.
- [Ownership checks duplicated across endpoints] -> Mitigation: implement shared budget authorization guard/service helper and test matrix for 401/403 paths.

## Migration Plan

1. Add OpenAPI budget paths/components and error responses in `backend/openapi.yaml`.
2. Mirror OpenAPI updates to `openspec/specs/openapi.yaml`.
3. Add DB migration for `budgets` table, uniqueness constraint, and `(user_id, month)` index.
4. Implement budget router/service/repository and wire dependencies.
5. Add/extend ProblemDetails constants and handlers for budget-specific conflicts.
6. Implement analytics enrichment (`spent vs limit`) behind existing auth and media-type behavior.
7. Execute full test suite with coverage gate (`>= 90%`) and resolve regressions.

Rollback strategy:
- Revert application code and OpenAPI changes.
- Drop `budgets` table/indexes via down migration if deployment rollback requires schema reversal.
- Preserve existing endpoints untouched to minimize rollback blast radius.

## Open Questions

- Should `GET /budgets` default to current month when `from`/`to` are omitted, or require both query params explicitly?
- For archived budgets (`DELETE` archive), should `GET /budgets/{budget_id}` remain retrievable or return not found/hidden semantics?
- Should analytics include budget status buckets (under/on/over limit) in this HU or remain strictly `spent vs limit` numeric fields?
