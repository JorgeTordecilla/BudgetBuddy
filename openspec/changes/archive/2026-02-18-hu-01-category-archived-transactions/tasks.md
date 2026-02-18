## 1. Canonical Archived-Category Error

- [x] 1.1 Add `CATEGORY_ARCHIVED_TYPE`, `CATEGORY_ARCHIVED_TITLE`, `CATEGORY_ARCHIVED_STATUS` in `backend/app/errors.py`
- [x] 1.2 Add helper `category_archived_error(detail: str | None = None) -> APIError`
- [x] 1.3 Keep existing account-archived and category-type-mismatch helpers unchanged (non-regression)

## 2. Runtime Validation for Create + Patch

- [x] 2.1 Update shared transaction business-rule validation to reject archived categories (`archived_at != null`)
- [x] 2.2 Ensure `POST /transactions` uses the shared validator and returns canonical category-archived `409`
- [x] 2.3 Ensure `PATCH /transactions/{transaction_id}` validates effective final category and returns canonical category-archived `409`
- [x] 2.4 Keep category lookup/validation as a single query path to avoid unnecessary DB round trips

## 3. Contract and OpenAPI Alignment

- [x] 3.1 Update OpenAPI `POST /transactions` to include `409` conflict for archived category with `application/problem+json`
- [x] 3.2 Update OpenAPI `PATCH /transactions/{transaction_id}` to include `409` conflict for archived category with `application/problem+json`
- [x] 3.3 Verify success responses remain `application/vnd.budgetbuddy.v1+json` and error responses remain `application/problem+json`

## 4. Integration Tests

- [x] 4.1 Add `test_create_transaction_fails_when_category_is_archived` with exact canonical `type/title/status` assertions
- [x] 4.2 Add `test_patch_transaction_fails_when_category_is_archived` covering effective final state and exact canonical `type/title/status`
- [x] 4.3 Ensure no regression for existing account-archived and category-type-mismatch tests

## 5. Verification

- [x] 5.1 From `backend` with `.venv` activated, run `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 5.2 Confirm all tests pass and overall coverage remains `>= 90%`
