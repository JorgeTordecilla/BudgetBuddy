## Context

Cursor pagination currently works but lacks fully explicit contract guarantees across accounts, categories, and transactions. HU-09 hardens deterministic paging semantics and aligns cursor construction with endpoint ordering to avoid duplicates and skips.

## Goals / Non-Goals

**Goals:**
- Document cursor pagination behavior and terminal cursor semantics for list endpoints.
- Enforce ordering/cursor-key alignment in accounts, categories, and transactions list handlers.
- Validate deterministic multi-page behavior via integration tests (`N=25`, `limit=10`) without overlaps.
- Preserve canonical invalid-cursor error handling.

**Non-Goals:**
- Introduce snapshot/consistent-read paging semantics.
- Redesign media types or non-pagination response contracts.
- Change unrelated business-rule conflicts.

## Decisions

- Decision: Cursor remains opaque and represented as `base64url(JSON)`.
  - Rationale: keeps transport-compatible token while allowing internal evolution.

- Decision: Cursor key set is endpoint-specific but always equal to the endpoint sort key.
  - Rationale: prevents page-boundary drift and duplicate/skip behavior.

- Decision: Concurrency behavior documented as best-effort deterministic paging for stable datasets.
  - Rationale: aligns with current non-snapshot DB access pattern.

- Decision: Invalid cursor behavior remains canonical (`400 invalid-cursor`).
  - Rationale: avoids contract regressions and keeps client recovery logic stable.

## Risks / Trade-offs

- [Risk] Existing cursors may encode legacy keys.
  -> Mitigation: preserve backward compatibility where possible or document invalidation clearly.

- [Risk] Sort/cursor mismatch can reintroduce duplicates across endpoints.
  -> Mitigation: add endpoint-level multi-page integration tests and enforce aligned predicates.

- [Risk] Concurrent inserts/updates between page requests can change relative ordering.
  -> Mitigation: document best-effort semantics and avoid claiming snapshot guarantees.

## Migration Plan

1. Update OpenAPI docs for cursor semantics and terminal `next_cursor` behavior.
2. Verify/adjust cursor encode/decode utility and endpoint boundary predicates.
3. Add deterministic pagination tests for accounts/categories/transactions with 25 records and limit 10.
4. Run full backend test suite with coverage gate (`>= 90%`).

## Open Questions

- Resolved: legacy cursor compatibility is explicitly defined for API v1.
  - `GET /transactions` accepts legacy cursor payloads (`date` + `id`) for backward compatibility.
  - `GET /accounts` and `GET /categories` do not support legacy shapes; invalid shape returns canonical `400 Invalid cursor`.
