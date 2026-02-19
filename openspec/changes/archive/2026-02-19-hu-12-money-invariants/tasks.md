## 1. Domain Money Validation

- [x] 1.1 Introduce a shared money validation path used by transaction create and patch flows.
- [x] 1.2 Enforce strict integer-only `amount_cents` validation on `POST /transactions` and `PATCH /transactions/{transaction_id}`.
- [x] 1.3 Define and enforce safe `amount_cents` bounds (min/max) to block absurd or overflow-risk values.
- [x] 1.4 Enforce sign invariants for `amount_cents` based on effective transaction type.
- [x] 1.5 Enforce user `currency_code` consistency for transaction money operations.

## 2. Analytics Correctness

- [x] 2.1 Ensure `GET /analytics/by-month` aggregates using integer cents only.
- [x] 2.2 Ensure `GET /analytics/by-category` aggregates using integer cents only.
- [x] 2.3 Ensure analytics totals are computed within a single user currency context.

## 3. Canonical ProblemDetails and Contract Safety

- [x] 3.1 Add/adjust canonical `400` ProblemDetails constants for money validation failures.
- [x] 3.2 Map money validation failures to canonical `application/problem+json` payloads (`type`, `title`, `status`).
- [x] 3.3 Ensure money validation errors never expose stack traces or internal implementation details.
- [x] 3.4 Verify no media-type regressions (`application/vnd.budgetbuddy.v1+json` success, `application/problem+json` errors).

## 4. Integration Tests

- [x] 4.1 Add integration tests for invalid `amount_cents` on transaction create (non-integer, zero, sign-invalid, out-of-range).
- [x] 4.2 Add integration tests for invalid `amount_cents` on transaction patch (non-integer, zero, sign-invalid, out-of-range).
- [x] 4.3 Add integration tests for transaction currency mismatch scenarios.
- [x] 4.4 Assert canonical `400` ProblemDetails responses (`type`, `title`, `status`, content-type).
- [x] 4.5 Add analytics tests asserting integer-cents totals and currency consistency.

## 5. Verification

- [x] 5.1 Run full tests from `backend` using `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest`.
- [x] 5.2 Run coverage from `backend` using `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`.
- [x] 5.3 Verify total coverage for `app` remains `>= 90%`.
- [x] 5.4 Verify no OpenAPI/response contract regressions on impacted endpoints.
