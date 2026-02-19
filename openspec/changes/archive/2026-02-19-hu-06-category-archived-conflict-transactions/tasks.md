## 1. Canonical Conflict Wiring

- [x] 1.1 Ensure canonical `category-archived` constants/helper exist in `backend/app/errors.py` (`type/title/status`)
- [x] 1.2 Ensure transaction business-rule validation raises canonical `category_archived_error()` when category is archived
- [x] 1.3 Ensure create and patch paths reuse the same centralized validation path (no duplicated conflict logic)

## 2. Transaction Runtime Behavior

- [x] 2.1 Enforce `POST /transactions` conflict when `category.archived_at != null`
- [x] 2.2 Enforce `PATCH /transactions/{transaction_id}` conflict when changing `category_id` to archived category
- [x] 2.3 Enforce patch keep-path conflict when effective current category is archived

## 3. Contract and Tests

- [x] 3.1 Confirm `backend/openapi.yaml` and `openspec/specs/openapi.yaml` expose transaction `409` conflict mapping with `application/problem+json`
- [x] 3.2 Add/adjust integration test for create archived-category conflict with exact canonical `type/title/status`
- [x] 3.3 Add/adjust integration tests for patch archived-category conflict (change-path + keep-path) with exact canonical `type/title/status`

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm tests pass and total coverage remains `>= 90%`
