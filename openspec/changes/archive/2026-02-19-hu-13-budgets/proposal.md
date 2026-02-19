## Why

Budget planning is a core budgeting workflow and is currently missing from the product, which limits users to recording history without defining spending limits. This change adds first-class monthly category budgets now so users can compare planned limits against actual spending in the same API contract.

## What Changes

- Add a new `Budget` resource scoped to a user, category, and month (`YYYY-MM`) with integer `limit_cents`.
- Extend OpenAPI with new budget schemas and CRUD/list endpoints:
  - `GET /budgets?from&to`
  - `POST /budgets`
  - `GET /budgets/{budget_id}`
  - `PATCH /budgets/{budget_id}`
  - `DELETE /budgets/{budget_id}` (archive behavior)
- Add explicit error semantics for budget operations:
  - `401`/`403` for auth and ownership rules
  - `406` for `Accept` negotiation failures
  - `409` for business conflicts (category not owned, category archived, duplicate monthly budget key)
- Complement analytics outputs with budget context (`spent vs limit`) while preserving money invariants (`*_cents` integer-only values).

## Capabilities

### New Capabilities
- `budget-limits-management`: Defines budget domain behavior and API requirements for monthly/category limits, uniqueness, archival semantics, and budget CRUD/list operations.

### Modified Capabilities
- `budget-analytics-reporting`: Extends analytics requirements to include budget-aware insights (`spent vs limit`) consistent with integer cents handling.
- `problem-details-catalog`: Adds/clarifies canonical ProblemDetails entries for budget conflict and validation scenarios (notably `409` variants used by budget rules).
- `api-http-contract`: Extends HTTP contract requirements for new `/budgets` endpoints, including media-type negotiation and status-code behavior.

## Impact

- API contract changes in `backend/openapi.yaml` and mirrored OpenSpec contract in `openspec/specs/openapi.yaml`.
- New OpenAPI paths: `GET /budgets`, `POST /budgets`, `GET /budgets/{budget_id}`, `PATCH /budgets/{budget_id}`, `DELETE /budgets/{budget_id}`.
- New/updated OpenAPI components (expected): `Budget`, `BudgetCreate`, `BudgetUpdate`, `BudgetListResponse`, plus ProblemDetails entries used by budget conflicts.
- Backend implementation impact in router/service/repository layers and persistence schema (including index support for `(user_id, month)` and uniqueness on `(user_id, month, category_id)`).
- Test impact across integration suites for happy paths, auth/ownership, content negotiation, and conflict/error coverage.
- Backwards compatibility: additive endpoint and schema expansion with no breaking change to existing endpoints; existing contracts remain intact.
- Media type impact: budget success responses follow `application/vnd.budgetbuddy.v1+json`; budget errors follow `application/problem+json`, aligned with current API rules.
