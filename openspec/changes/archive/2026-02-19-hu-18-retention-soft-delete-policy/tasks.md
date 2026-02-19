## 1. Contract Definition

- [x] 1.1 Document archived semantics per endpoint in `backend/openapi.yaml` (list defaults, include toggle, archive delete semantics).
- [x] 1.2 Align OpenAPI wording for ownership/authz and archive semantics consistency.
- [x] 1.3 Mirror OpenAPI updates to `openspec/specs/openapi.yaml`.

## 2. Behavior Alignment

- [x] 2.1 Ensure accounts/categories/transactions list endpoints apply a consistent include/exclude archived policy.
- [x] 2.2 Ensure related runtime behaviors (get/import/write constraints) remain consistent with archived policy boundaries.
- [x] 2.3 Implement explicit analytics policy for archived transactions (exclude by policy) and align both analytics endpoints.

## 3. Tests

- [x] 3.1 Add integration tests for include_archived default-vs-true behavior across accounts/categories/transactions.
- [x] 3.2 Add analytics tests verifying archived transactions are excluded and restored transactions are included again.
- [x] 3.3 Add/adjust contract tests to verify documented archive semantics remain aligned with OpenAPI.

## 4. Verification

- [x] 4.1 Run full backend tests from `backend` using `.venv\Scripts\python.exe -m pytest`.
- [x] 4.2 Run coverage from `backend` using `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 4.3 Verify no regressions in auth/ownership/problem-details behavior after retention-policy hardening.
