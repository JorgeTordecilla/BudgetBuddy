## Context

Accounts, categories, and transactions lists use cursor pagination. Invalid cursor values should fail fast and predictably before expensive query execution. Today, behavior may vary depending on decode/parse failure mode.

## Goals / Non-Goals

**Goals:**
- Canonicalize invalid cursor error payload for all cursor-enabled list endpoints.
- Ensure one shared decode path emits the same APIError semantics.
- Add integration tests that assert exact ProblemDetails fields.

**Non-Goals:**
- No changes to cursor format for valid cursors.
- No changes to pagination ordering or limit semantics.
- No changes to successful response media type.

## Decisions

1. Shared canonical helper in `app/errors.py`
- Decision: add `INVALID_CURSOR_*` constants and `invalid_cursor_error(...)`.
- Rationale: avoid string/status/type duplication in pagination and routers.

2. Fail-fast decode in pagination core
- Decision: `decode_cursor` raises canonical APIError for malformed base64/JSON/shape issues.
- Rationale: centralizes cursor validation and ensures uniform 400 response.

3. Router behavior remains thin
- Decision: routers continue calling `decode_cursor`; no custom try/except that mutates error shape.
- Rationale: prevents endpoint divergence and reduces maintenance risk.

## Risks / Trade-offs

- [Over-broad exception capture in decode path] -> Mitigation: map only cursor decode/parse/shape failures to canonical invalid-cursor error.
- [Hidden regressions in list endpoints] -> Mitigation: add three integration tests and run full suite with coverage.
- [Contract drift between backend/openapi and openspec/openapi] -> Mitigation: include OpenAPI alignment task and verification.
