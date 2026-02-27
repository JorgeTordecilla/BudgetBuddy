## Context

The frontend currently supports transactions list/create/update/archive/restore, but does not include bulk import UI. Backend contract for `POST /transactions/import` is already available and must be consumed as-is.

Import endpoint contract highlights:
- Request: `TransactionImportRequest` with `mode` and `items[]`
- Response: `TransactionImportResult` with counts and item-level failures
- Error model: `application/problem+json`
- Success model: `application/vnd.budgetbuddy.v1+json`

The existing API client already enforces:
- vendor `Accept`
- vendor `Content-Type` for write methods
- `credentials: include`
- `401` refresh + retry once

## Goals / Non-Goals

**Goals**
- Ship a contract-first bulk import flow at `/app/transactions/import`.
- Support JSON paste input with deterministic parser/validation.
- Render clear import outcome including item-level failures and ProblemDetails metadata.
- Preserve auth/session and query invalidation standards.
- Add tests for parser and page behavior.

**Non-Goals**
- CSV import in this HU (can be follow-up).
- Backend endpoint/schema modifications.
- Replacing API client auth/refresh strategy.

## Decisions

1. Route and navigation
- Decision: add `/app/transactions/import` as authenticated route and expose entry from the Transactions page action menu (not global AppShell nav).
- Rationale: keep import discoverable in-context without overloading primary navigation.

2. Input formats
- Decision: accept two JSON input shapes in parser:
  - object `{ mode, items }`
  - array `items[]` with mode from selector.
- Rationale: improves UX without changing request contract.

3. Validation boundary
- Decision: perform lightweight client validation before submit:
  - JSON parse validity
  - non-empty items
  - required fields (`type`, `account_id`, `category_id`, `amount_cents`, `date`)
  - `amount_cents` integer > 0
  - `type` in `income|expense`
  - `date` format `YYYY-MM-DD`
- Rationale: fail fast for obvious issues while preserving backend as source of truth.

4. Result rendering
- Decision: show summary counters and a failures table (`index`, `message`, `problem.type`, `problem.title`, `problem.status`, optional `problem.detail`).
- Rationale: deterministic operator feedback for partial imports.

5. Query invalidation
- Decision: on successful import response, invalidate:
  - `['transactions']`
  - `['analytics']`
  - optional `['budgets']` for overlay consistency.
- Rationale: keep dashboards and transaction views fresh after batch changes.

6. Error handling
- Decision: endpoint-level non-200 responses use existing `ApiProblemError` + mapped ProblemDetails panel; item-level failures are displayed from response payload without throwing.
- Rationale: separates transport errors from row-level import errors.

## Risks / Trade-offs

- [Risk] Large pasted JSON can degrade browser responsiveness.
  - Mitigation: add client-side size warning threshold (for example ~1-2MB).
- [Risk] Confusion between global endpoint error and row-level failures.
  - Mitigation: separate UI regions for "request failed" vs "import completed with row failures".
- [Risk] Parser strictness mismatch with backend rules.
  - Mitigation: keep parser basic and surface backend ProblemDetails clearly.

## Migration Plan

1. Add import types and API wrapper in transactions API module.
2. Implement parser utility + unit tests.
3. Implement import page + result panel + mutation flow.
4. Wire route and AppShell navigation link.
5. Add component tests covering parse errors, success/failure rendering, and 401 retry behavior.
6. Run frontend quality gates: test, coverage >= 90%, build.

## Open Questions

- Should the import screen prefill a template snippet for first-time users?
- Should `['budgets']` invalidation be mandatory or deferred until overlay coupling is explicit in runtime behavior?
- Do we want a hard limit on row count in FE (in addition to backend limits) in this HU?
