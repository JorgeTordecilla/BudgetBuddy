## Context

BudgetBuddy is contract-first and already provides authenticated transaction CRUD and analytics. HU-14 adds cross-cutting import/export functionality for transactions, which touches OpenAPI, router/service logic, validation/error mapping, and performance-sensitive response streaming.

The change must preserve existing transaction business rules and canonical error behavior, while introducing practical batch ingestion and portable CSV export for onboarding and migration workflows.

## Goals / Non-Goals

**Goals:**
- Add `POST /transactions/import` for bulk ingestion with per-row validation outcomes and aggregate counters.
- Add `GET /transactions/export` returning filtered `text/csv` output with streaming semantics.
- Reuse existing transaction domain rules per imported row (ownership, archived account/category conflicts, category-type mismatch, money invariants).
- Provide configurable import execution mode: all-or-nothing vs partial accept.
- Preserve contract-first guarantees and existing media-type behavior for current endpoints.
- Keep error payloads canonical and sanitized (`application/problem+json`), including row-level failure reporting that avoids leaking internal implementation details.

**Non-Goals:**
- Full asynchronous import jobs/queue processing.
- File storage pipelines or background blob processing.
- New business rules for transactions beyond reusing current ones.
- Historical schema migration for external source mappings.

## Decisions

1. Introduce dedicated transaction bulk import/export application flow
- Decision: Implement import/export as dedicated transaction router handlers with shared validation/business-rule utilities reused from current transaction paths.
- Rationale: Keeps behavior consistent and minimizes divergence from existing domain enforcement.
- Alternative considered: separate micro-module with duplicated rules. Rejected due to drift risk and maintenance overhead.

2. Import result model uses deterministic aggregate + per-row failures
- Decision: Import response includes `created_count`, `failed_count`, and `failures[]` with row index and sanitized message (optional canonical `problem` object).
- Rationale: Supports user feedback and retry workflows without exposing internals.
- Alternative considered: fail-fast single error response. Rejected because mixed-row uploads are expected in onboarding.

3. Configurable import acceptance mode in request
- Decision: Include an explicit import mode flag (e.g., `all_or_nothing` or `partial`) in request semantics.
- Rationale: Different clients need strict atomicity vs best-effort ingestion.
- Behavior:
  - `all_or_nothing`: any row error causes no inserts for the batch.
  - `partial`: valid rows are committed, invalid rows returned in `failures`.
- Alternative considered: fixed partial mode only. Rejected due to lack of operational control for strict workflows.

4. Export uses streaming CSV generation
- Decision: Implement `GET /transactions/export` using streaming response generation over filtered transaction query results.
- Rationale: Prevents memory blowup for large exports and satisfies performance NFR.
- Alternative considered: materialize full CSV in memory and return once complete. Rejected for memory scalability concerns.

5. Contract-first media-type and error taxonomy
- Decision: Update OpenAPI first for new paths/components and enforce:
  - Import success: `application/vnd.budgetbuddy.v1+json`
  - Export success: `text/csv`
  - Errors: `application/problem+json`
- Canonical error taxonomy additions:
  - Import request-level validation failures (`400`)
  - Import row business conflicts mapped from existing canonical transaction errors (`409` semantics represented per row in result)
  - Auth/ownership/negotiation errors (`401/403/406`) for both endpoints
- Alternative considered: ad-hoc import failure strings only. Rejected because clients need stable machine-readable error semantics.

6. Batch limit and bounded work per request
- Decision: Enforce a configurable max batch size for import (application setting constant).
- Rationale: Protects API from abuse and operational spikes; supports predictable latency.
- Alternative considered: unbounded import list. Rejected for performance and security risk.

## Risks / Trade-offs

- [Row-level failure mapping may drift from canonical ProblemDetails over time] → Mitigation: centralize mapping helper from transaction rule errors to import failure `problem` payloads and cover with integration tests.
- [All-or-nothing mode can increase transaction lock time on large batches] → Mitigation: enforce conservative batch limits and provide partial mode for higher-throughput clients.
- [CSV streaming correctness can vary across DB drivers/dialects] → Mitigation: test export behavior with realistic seeded data and validate headers/row counts deterministically.
- [Mixed media-type behavior (JSON import, CSV export) may increase contract complexity] → Mitigation: explicit OpenAPI content mapping and accept/content-type matrix tests.

## Migration Plan

1. Extend `backend/openapi.yaml` with import/export paths, request/response schemas, and media-type mappings.
2. Mirror OpenAPI updates to `openspec/specs/openapi.yaml`.
3. Implement import/export router logic and shared helpers for per-row validation mapping.
4. Add batch limit configuration and streaming export response construction.
5. Add integration tests:
   - mixed valid/invalid import rows,
   - CSV export header/row count,
   - auth/accept/content-type matrix.
6. Run full backend tests and coverage gate (`>= 90%`).

Rollback strategy:
- Revert code and OpenAPI changes for import/export endpoints.
- Keep existing transaction endpoints unchanged to minimize rollback blast radius.
- No irreversible DB schema changes are required for this feature by default.

## Open Questions

- Should CSV import be enabled in HU-14 immediately or shipped as JSON-only import with CSV flagged as next increment?
- In partial mode, should successful rows be committed in one transaction or in smaller chunks for very large batches?
- For `failures[].problem`, should full canonical `type/title/status` always be included or only when mapping from known domain conflicts?
