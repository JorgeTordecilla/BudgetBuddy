## Why

`POST /transactions` currently rejects category/type mismatches as a generic conflict, but clients cannot reliably distinguish this case from other business-rule conflicts. A canonical error contract is needed so UI and integrations can provide deterministic handling.

## What Changes

- Define explicit business rule behavior for category-type mismatch on transaction writes.
- Return `409 Conflict` with `application/problem+json` and canonical `ProblemDetails` values for this mismatch case.
- Centralize mismatch problem metadata in shared backend constants (`app/errors.py` or equivalent) to avoid literal drift.
- Add integration test coverage for mismatch flow and exact `type/title/status` assertions.
- Preserve existing behavior for other conflict paths.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `budget-domain-management`: Transaction writes with category/type mismatch must return deterministic conflict semantics.
- `api-http-contract`: ProblemDetails for category/type mismatch conflict must expose canonical `type`, `title`, and `status`.

## Impact

- Affected code: transaction business-rule validation and shared error constants/helpers.
- Affected API behavior: `POST /transactions` and relevant update paths when `transaction.type` does not match `category.type`.
- Affected tests: integration/contract assertions for mismatch conflict with exact ProblemDetails fields.
