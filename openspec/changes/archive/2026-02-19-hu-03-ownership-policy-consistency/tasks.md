## 1. Policy Canonicalization

- [x] 1.1 Confirm and document chosen ownership policy as `403 Forbidden` for non-owned resources
- [x] 1.2 Ensure canonical helper usage from `backend/app/errors.py` for ownership denials

## 2. Runtime Enforcement

- [x] 2.1 Normalize ownership guard paths in `backend/app/routers/accounts.py` to always return canonical `403`
- [x] 2.2 Normalize ownership guard paths in `backend/app/routers/categories.py` to always return canonical `403`
- [x] 2.3 Normalize ownership guard paths in `backend/app/routers/transactions.py` to always return canonical `403`

## 3. Contract Updates

- [x] 3.1 Update `backend/openapi.yaml` ownership responses to consistently document `403` for scoped endpoints
- [x] 3.2 Update `openspec/specs/openapi.yaml` mirror with same `403` ownership policy mapping
- [x] 3.3 Document policy in API docs/spec narrative (DX note)

## 4. Tests

- [x] 4.1 Update existing cross-user tests to assert deterministic `403` (remove any `403 or 404` ambiguity)
- [x] 4.2 Add ownership matrix tests for accounts (`GET/PATCH/DELETE` non-owned -> 403)
- [x] 4.3 Add ownership matrix tests for categories (`GET/PATCH/DELETE` non-owned -> 403)
- [x] 4.4 Add ownership matrix tests for transactions (`GET/PATCH/DELETE` non-owned -> 403)
- [x] 4.5 Assert canonical forbidden `type/title/status` in new and adjusted tests

## 5. Verification

- [x] 5.1 From `backend` with `.venv` activated, run `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 5.2 Confirm tests pass and overall coverage remains `>= 90%`
