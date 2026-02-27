## Context

The frontend already provides transaction list filters (`type`, `account`, `category`) and has a shared API client with:
- `credentials: include`
- bearer auth header injection
- `401` refresh + retry once behavior
- canonical ProblemDetails parsing helpers

The backend already exposes `GET /transactions/export` returning:
- `200 text/csv`
- `400/401/406/429 application/problem+json`
- optional `Retry-After` on `429`

## Goals / Non-Goals

**Goals**
- Export the same subset users are viewing in Transactions, using currently applied filters.
- Download CSV reliably in-browser via `Blob`.
- Preserve deterministic auth and error behavior.
- Keep UX clean by placing export in Transactions actions menu.
- Add unit/component coverage for core export logic.

**Non-Goals**
- New backend endpoint creation.
- Auto-retry after `429`.
- Background export jobs or server-side async export.

## Decisions

1. Export entry point
- Decision: keep export under Transactions page "More options" menu next to Import.
- Rationale: contextual discoverability without adding global nav noise.

2. Filter mapping
- Decision: export uses the current Transactions filter state as query params:
  - `type`, `account_id`, `category_id`, `from`, `to`.
- Rationale: guarantees WYSIWYG export subset and avoids duplicate filter forms.

3. Date filters in Transactions UI
- Decision: add `from` and `to` date controls to Transactions filters (if absent) and use same state for list and export.
- Rationale: export contract includes date range and should match list behavior.

4. Content negotiation
- Decision: set request `Accept` to `text/csv, application/problem+json` for export requests.
- Rationale: prevent `406` while allowing canonical error parsing.

5. Download mechanics
- Decision: implement `downloadBlob(blob, filename)` utility and use object URL flow.
- Rationale: browser-compatible and deterministic.

6. Filename strategy
- Decision:
  1) use `Content-Disposition` filename when present
  2) otherwise fallback to `budgetbuddy-transactions-YYYYMMDD-HHmm.csv`
- Rationale: support backend-provided names while keeping stable local fallback.

7. Error and retry handling
- Decision:
  - reuse existing shared API client for `401` refresh + single retry
  - on `429`, read `Retry-After` and show explicit UI message
  - parse non-200 responses as ProblemDetails
- Rationale: consistent behavior across frontend modules.

8. CSV payload semantics for end users
- Decision: backend export stream returns user-facing columns only (`date`, `type`, `account`, `category`, `amount_cents`, `merchant`, `note`) and excludes internal identifiers/timestamps.
- Rationale: CSV export is for portability and analysis, not internal database debugging.

## Risks / Trade-offs

- [Risk] CSV may be large and memory-heavy in browser.
  - Mitigation: use `Blob` download path and avoid text parsing.
- [Risk] Filter/list-export mismatch if filter sources diverge.
  - Mitigation: single source of truth for filters in Transactions page state.
- [Risk] Incorrect `Accept` handling could produce `406`.
  - Mitigation: dedicated export request helper with explicit header tests.

## Migration Plan

1. Extend transactions filter model and UI with optional `from`/`to`.
2. Add export query builder and CSV request wrapper in API layer.
3. Add download utility and filename resolver.
4. Wire export action into Transactions "More options" menu with loading/error states.
5. Add tests:
   - query-string composition
   - filename resolution
   - export success download path
   - `401` retry once
   - `429` Retry-After feedback
6. Align backend CSV serializer and OpenAPI CSV example with user-facing column contract.
7. Run frontend quality gates: test, coverage >= 90%, build.

## Open Questions

- Should `include_archived` be part of export query in this HU or remain excluded by contract?
- Should fallback filename include filter hint tokens (`income`, `expense`) or stay minimal?
