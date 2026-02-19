## 1. OpenAPI Contract Normalization

- [x] 1.1 Normalize error response descriptions in `backend/openapi.yaml` for canonical `400/401/403/406/409` semantics
- [x] 1.2 Apply the same normalization in `openspec/specs/openapi.yaml` to keep mirror parity
- [x] 1.3 Fix `DELETE /transactions/{transaction_id}` `403` description to `Forbidden (resource is not owned by authenticated user)` in both contract files

## 2. ProblemDetails Catalog Documentation

- [x] 2.1 Add a canonical ProblemDetails catalog (exact `type`, `title`, `status`) in OpenAPI documentation location agreed for this repo
- [x] 2.2 Ensure catalog includes canonical `401 Unauthorized`, `403 Forbidden`, `406 Not Acceptable`, `400 Invalid cursor`, and current `409` business conflict types
- [x] 2.3 Verify catalog entries match constants/helpers used by runtime error emitters (`app/errors.py` and related paths)

## 3. Runtime and Test Alignment

- [x] 3.1 Review `enforce_accept_header`, auth, ownership, cursor, and conflict paths to confirm exact canonical ProblemDetails are emitted
- [x] 3.2 Confirm existing tests already assert canonical `type/title/status` for representative `400/401/403/406/409` cases
- [x] 3.3 Add minimal tests only where canonical assertion coverage is missing for critical paths

## 4. Verification

- [x] 4.1 Run from `backend` with `.venv`: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm all tests pass and total coverage remains `>= 90%`
