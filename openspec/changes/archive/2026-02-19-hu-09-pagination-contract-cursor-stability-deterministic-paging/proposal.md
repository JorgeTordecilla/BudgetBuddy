## Why

Cursor pagination is a frequent source of API integration defects (duplicates, gaps, invalid cursors, unstable ordering). HU-09 formalizes deterministic paging semantics so clients can page reliably across accounts, categories, and transactions.

## What Changes

- Document cursor format and contract behavior for list endpoints (`GET /accounts`, `GET /categories`, `GET /transactions`).
- Require cursor construction to use the same deterministic sort key as each endpoint query.
- Define deterministic paging guarantees: no overlap, no gaps for stable datasets, and `next_cursor=null` at the end.
- Keep canonical invalid-cursor behavior (`400` ProblemDetails) unchanged.
- Add integration tests for 2+ pages per endpoint (`N=25`, `limit=10`) validating no duplicates, no skips, and terminal `next_cursor=null`.
- Document concurrency expectation as best-effort stability (no snapshot semantics unless explicitly implemented).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: Extend list endpoint contract with cursor shape, deterministic paging rules, and terminal cursor behavior.
- `budget-domain-management`: Define deterministic paging behavior and per-resource ordering alignment between query and cursor.

## Impact

- Contract files: `backend/openapi.yaml`, `openspec/specs/openapi.yaml`.
- Runtime pagination utilities: `backend/app/core/pagination.py`.
- List endpoint implementations: `backend/app/routers/accounts.py`, `backend/app/routers/categories.py`, `backend/app/routers/transactions.py`.
- Integration tests: `backend/tests/test_api_integration.py`.
- Backward compatibility: preserves invalid-cursor canonical errors while clarifying deterministic paging behavior.
- Media types unchanged: successful payloads `application/vnd.budgetbuddy.v1+json`; errors `application/problem+json`.
