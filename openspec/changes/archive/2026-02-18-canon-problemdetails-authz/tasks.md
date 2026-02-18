## 1. Canonical Error Helpers

- [x] 1.1 Add canonical constants and helper constructors for 401/403/406 in `backend/app/errors.py`
- [x] 1.2 Keep existing business-rule helpers intact (account archived/category type mismatch)

## 2. Wire Helpers in Runtime Paths

- [x] 2.1 Update `enforce_accept_header` to use canonical 406 helper
- [x] 2.2 Update `get_current_user` auth failures to use canonical 401 helper
- [x] 2.3 Update ownership checks in accounts/categories/transactions routers to use canonical 403 helper

## 3. Test Canonical Restore Matrix

- [x] 3.1 Update restore-category 401 test to assert exact canonical `type/title/status`
- [x] 3.2 Update restore-category 403 test to assert exact canonical `type/title/status`
- [x] 3.3 Update restore-category 406 test to assert exact canonical `type/title/status`

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm all tests pass and total coverage remains `>= 90%`
