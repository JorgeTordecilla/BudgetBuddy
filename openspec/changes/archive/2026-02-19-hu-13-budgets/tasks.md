## 1. OpenAPI and Contract Updates

- [x] 1.1 Add budget schemas to `backend/openapi.yaml`: `Budget`, `BudgetCreate`, `BudgetUpdate`, and `BudgetListResponse`.
- [x] 1.2 Add budget endpoints and response mappings in `backend/openapi.yaml`: `GET /budgets`, `POST /budgets`, `GET /budgets/{budget_id}`, `PATCH /budgets/{budget_id}`, `DELETE /budgets/{budget_id}`.
- [x] 1.3 Ensure budget endpoints declare canonical error responses for `401`, `403`, `406`, and `409` with `application/problem+json`.
- [x] 1.4 Add canonical ProblemDetails catalog entries for budget conflicts (`budget-duplicate`, `category-not-owned`, `category-archived`) and budget validation failures.
- [x] 1.5 Mirror all contract changes into `openspec/specs/openapi.yaml` without drift.

## 2. Persistence and Domain Model

- [x] 2.1 Add `budgets` persistence model/entity with user scope, category link, month key (`YYYY-MM`), integer `limit_cents`, archival fields, and timestamps.
- [x] 2.2 Add DB migration for `budgets` table, uniqueness constraint on `(user_id, month, category_id)`, and index on `(user_id, month)`.
- [x] 2.3 Implement repository/storage operations for budget create, range list, get-by-id, patch, and archive.
- [x] 2.4 Enforce month format invariant (`YYYY-MM`) at write boundaries.
- [x] 2.5 Enforce money invariant for budgets (`limit_cents` integer and positive within safe bounds).

## 3. Budget API and Business Rules

- [x] 3.1 Add budgets router/module and wire dependencies (auth, repositories/services, response shaping).
- [x] 3.2 Implement `POST /budgets` with ownership checks and duplicate-key conflict mapping to canonical `409`.
- [x] 3.3 Implement `GET /budgets?from&to` with user scoping and month-range filtering.
- [x] 3.4 Implement `GET /budgets/{budget_id}` and `PATCH /budgets/{budget_id}` with strict ownership enforcement.
- [x] 3.5 Implement `DELETE /budgets/{budget_id}` as archive semantics with `204` empty response body.
- [x] 3.6 Enforce category preconditions on budget writes: reject non-owned category (`409`) and archived category (`409 category-archived`).
- [x] 3.7 Ensure budget endpoints preserve media-type behavior (`application/vnd.budgetbuddy.v1+json` success, `application/problem+json` errors).

## 4. Analytics Integration

- [x] 4.1 Extend analytics composition to include budget context (`spent vs limit`) when matching budgets exist.
- [x] 4.2 Ensure analytics budget comparisons use integer cents only and do not introduce rounding behavior.
- [x] 4.3 Keep analytics response changes additive and backward compatible with existing contract semantics.

## 5. Tests and Verification

- [x] 5.1 Add integration tests for budget happy path: create, list by range, get, patch, and archive.
- [x] 5.2 Add auth/ownership matrix tests for budget endpoints (`401` unauthenticated, `403` non-owner resource).
- [x] 5.3 Add `Accept` negotiation tests for budgets (`406` canonical ProblemDetails).
- [x] 5.4 Add budget conflict tests for duplicate monthly key, non-owned category, and archived category (`409` canonical ProblemDetails).
- [x] 5.5 Add/update analytics tests asserting deterministic integer-cents budget comparison behavior.
- [x] 5.6 List pagination was not required for `/budgets` in this implementation, so no pagination tests were added.
- [x] 5.7 Run full tests from `backend` using `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest`.
- [x] 5.8 Run coverage from `backend` using `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`.
- [x] 5.9 Verify total coverage for `app` remains `>= 90%` and no existing API contract regressions are introduced.

