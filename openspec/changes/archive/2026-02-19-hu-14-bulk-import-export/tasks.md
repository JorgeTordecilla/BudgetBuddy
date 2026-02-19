## 1. OpenAPI and Contract Updates

- [x] 1.1 Add `POST /transactions/import` to `backend/openapi.yaml` with request schema `TransactionImportRequest` and success schema `TransactionImportResult`.
- [x] 1.2 Add `GET /transactions/export` to `backend/openapi.yaml` with query filters (`from`, `to`, `type`, `account_id`, `category_id`) and `text/csv` success response mapping.
- [x] 1.3 Add reusable OpenAPI components `TransactionImportRequest`, `TransactionImportResult`, and `TransactionImportFailure`.
- [x] 1.4 Define canonical error response mappings for import/export (`400`, `401`, `403`, `406`, and applicable `409`) using `application/problem+json`.
- [x] 1.5 Mirror OpenAPI changes in `openspec/specs/openapi.yaml` to keep contract references aligned.

## 2. Bulk Import Backend Implementation

- [x] 2.1 Add import request/response models and parser/normalization helpers in the transactions module.
- [x] 2.2 Implement `POST /transactions/import` orchestration with configurable execution mode (`all_or_nothing` and `partial`).
- [x] 2.3 Enforce maximum batch size through configuration and return canonical validation `400` when exceeded.
- [x] 2.4 Reuse existing transaction write-domain validations per row (ownership, archived resources, category/type mismatch, money invariants).
- [x] 2.5 Implement deterministic result accounting (`created_count`, `failed_count`, `failures[]`) with stable row-index references.
- [x] 2.6 Add sanitized row-level failure mapping so internal stack traces/SQL/implementation details never leak.

## 3. CSV Export Backend Implementation

- [x] 3.1 Implement `GET /transactions/export` with the same effective filter semantics as `GET /transactions`.
- [x] 3.2 Implement CSV serialization with deterministic header and row field ordering.
- [x] 3.3 Return export responses as streamed `text/csv` output without full in-memory materialization.
- [x] 3.4 Enforce auth, ownership scope, and accept negotiation behavior consistent with existing contract rules.

## 4. ProblemDetails and Error Catalog Alignment

- [x] 4.1 Add/import canonical ProblemDetails entries for import request validation failures and negotiation failures.
- [x] 4.2 Map row-level import business-rule failures to canonical problem identities when applicable.
- [x] 4.3 Ensure import/export error paths continue emitting required ProblemDetails fields (`type`, `title`, `status`) with `application/problem+json`.

## 5. Tests and Verification

- [x] 5.1 Add integration tests for import mixed valid/invalid rows and assert deterministic counters and failure indexing.
- [x] 5.2 Add integration tests for import mode semantics (`all_or_nothing` rollback vs `partial` commit).
- [x] 5.3 Add integration tests for import batch-limit validation and canonical `400` behavior.
- [x] 5.4 Add integration tests for export success path validating CSV content type, header, and row count.
- [x] 5.5 Add auth and negotiation matrix tests for both import and export (`401`, `403`, `406`, and unsupported content type as applicable).
- [x] 5.6 Run full backend test suite from `backend` with `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest`.
- [x] 5.7 Run coverage gate from `backend` with `.venv`: `cd backend; .venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`.
- [x] 5.8 Confirm overall `app` coverage is `>= 90%` and no existing contract regressions are introduced.
