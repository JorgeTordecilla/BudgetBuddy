## 1. Canonical Invalid Cursor Error

- [x] 1.1 Add `INVALID_CURSOR_TYPE`, `INVALID_CURSOR_TITLE`, `INVALID_CURSOR_STATUS` in `backend/app/errors.py`
- [x] 1.2 Add helper `invalid_cursor_error(detail: str | None = None) -> APIError`
- [x] 1.3 Keep existing error helpers unchanged (non-regression)

## 2. Pagination Core Behavior

- [x] 2.1 Update `backend/app/core/pagination.py::decode_cursor` to raise canonical invalid-cursor APIError on malformed base64
- [x] 2.2 Ensure canonical invalid-cursor APIError on malformed JSON and missing required keys
- [x] 2.3 Keep decode failure fast before DB-heavy list query execution

## 3. Router and Contract Alignment

- [x] 3.1 Ensure `GET /accounts`, `GET /categories`, `GET /transactions` use shared `decode_cursor` path without swallowing canonical errors
- [x] 3.2 Update OpenAPI response descriptions/mapping for invalid cursor behavior on those list endpoints (backend and openspec mirror)
- [x] 3.3 Verify error media type stays `application/problem+json` and successful list responses stay `application/vnd.budgetbuddy.v1+json`

## 4. Integration Tests

- [x] 4.1 Add `test_list_accounts_invalid_cursor_returns_problem_details` with exact canonical `type/title/status`
- [x] 4.2 Add `test_list_categories_invalid_cursor_returns_problem_details` with exact canonical `type/title/status`
- [x] 4.3 Add `test_list_transactions_invalid_cursor_returns_problem_details` with exact canonical `type/title/status`

## 5. Verification

- [x] 5.1 From `backend` with `.venv` activated, run `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 5.2 Confirm tests pass and overall coverage remains `>= 90%`
