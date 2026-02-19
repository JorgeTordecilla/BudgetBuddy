## 1. Contract Updates

- [x] 1.1 Update `backend/openapi.yaml` and `openspec/specs/openapi.yaml` with explicit cursor behavior for `GET /accounts`, `GET /categories`, and `GET /transactions`
- [x] 1.2 Document deterministic paging semantics (no overlaps/skips for stable datasets) and `next_cursor=null` on terminal page
- [x] 1.3 Document cursor as opaque `base64url(JSON)` token and clarify best-effort concurrency expectations (non-snapshot unless specified)

## 2. Runtime Alignment

- [x] 2.1 Review/adjust `backend/app/core/pagination.py` to support endpoint cursor payloads needed by deterministic sort keys
- [x] 2.2 Ensure `backend/app/routers/accounts.py` uses cursor boundary predicates aligned with account query `ORDER BY`
- [x] 2.3 Ensure `backend/app/routers/categories.py` uses cursor boundary predicates aligned with category query `ORDER BY`
- [x] 2.4 Ensure `backend/app/routers/transactions.py` uses cursor boundary predicates aligned with transaction query `ORDER BY`
- [x] 2.5 Preserve canonical invalid-cursor handling (`400` ProblemDetails with exact `type/title/status`)

## 3. Integration Tests

- [x] 3.1 Add accounts pagination test with `N=25`, `limit=10`: page1/page2/page3 until `next_cursor=null` and assert no duplicates/skips
- [x] 3.2 Add categories pagination test with `N=25`, `limit=10`: page sequence assertions and no overlap
- [x] 3.3 Add transactions pagination test with `N=25`, `limit=10`: page sequence assertions and no overlap
- [x] 3.4 Keep/validate invalid cursor tests remain canonical for list endpoints

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm all tests pass and total coverage remains `>= 90%`
