## 1. OpenAPI example mapping cleanup

- [x] 1.1 Audit `backend/openapi.yaml` and identify every `application/problem+json` response with mismatched or misleading examples.
- [x] 1.2 Correct endpoint response examples so `400 invalid-cursor` is only used on cursor-invalid cases and `400 invalid-date-range` is only used on `from/to` validation cases.
- [x] 1.3 Correct `409` examples per operation to only include applicable canonical domain conflicts (`account-archived`, `category-archived`, `category-type-mismatch`, `budget-duplicate`, etc.).
- [x] 1.4 Ensure `401`, `403`, `406`, and `429` examples are mapped only where those responses are declared.
- [x] 1.5 Ensure auth `429` response documentation includes `Retry-After` header where throttling is documented.

## 2. Canonical reuse and mirror alignment

- [x] 2.1 Refactor duplicated inline ProblemDetails examples into reusable references (`components/examples` and/or catalog-backed entries) in `backend/openapi.yaml`.
- [x] 2.2 Keep canonical `type`, `title`, and `status` values aligned with the ProblemDetails catalog for every referenced example.
- [x] 2.3 Mirror the same example and reference cleanup in `openspec/specs/openapi.yaml` so contract mirror remains consistent.

## 3. Quality gates and spec artifacts

- [x] 3.1 Update OpenSpec delta specs for `api-http-contract` with response-to-example mapping requirements.
- [x] 3.2 Update OpenSpec delta specs for `problem-details-catalog` with canonical example reuse and context-specific 400/409 mapping requirements.
- [x] 3.3 Update OpenSpec delta specs for `openapi-quality-gates` with validation expectations for mismatched ProblemDetails examples and broken reusable refs.

## 4. Verification

- [x] 4.1 Validate OpenAPI contract checks used by the project (existing OpenSpec/OpenAPI verify command).
- [x] 4.2 Run backend tests from `backend` with `.venv\Scripts\python.exe -m pytest`.
- [x] 4.3 Run coverage from `backend` with `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm coverage remains `>= 90%`.
- [x] 4.4 Run `openspec.cmd verify-change hu-fr-03-openapi-error-examples-cleanup` and resolve warnings/suggestions before apply/archive.
