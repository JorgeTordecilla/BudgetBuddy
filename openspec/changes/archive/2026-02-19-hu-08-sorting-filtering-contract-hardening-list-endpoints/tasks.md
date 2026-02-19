## 1. Contract Hardening

- [x] 1.1 Update `backend/openapi.yaml` and `openspec/specs/openapi.yaml` to explicitly document transaction list ordering (`date desc`, tie-breaker `created_at desc`)
- [x] 1.2 Confirm `GET /transactions` parameter docs explicitly cover combined filters: `type`, `account_id`, `category_id`, `from`, `to`, `include_archived`
- [x] 1.3 Add/normalize invalid date-range `400` response contract for `GET /transactions` with `application/problem+json`

## 2. Runtime Behavior

- [x] 2.1 Add canonical invalid-date-range constants/helper in `backend/app/errors.py` (`type/title/status`)
- [x] 2.2 Ensure transaction list handler rejects `from > to` with canonical invalid-date-range `400`
- [x] 2.3 Ensure transaction list ordering is deterministic (`date desc`, tie-breaker `created_at desc`)
- [x] 2.4 Ensure cursor pagination logic remains consistent with enforced ordering (adjust in `backend/app/core/pagination.py` if needed)

## 3. Tests

- [x] 3.1 Add integration test for deterministic ordering when multiple transactions share the same `date`
- [x] 3.2 Add integration test for combined filters (`type + account_id + from/to`, optionally `category_id`)
- [x] 3.3 Add integration test for invalid range (`from > to`) asserting exact canonical ProblemDetails fields

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm all tests pass and total coverage remains `>= 90%`

