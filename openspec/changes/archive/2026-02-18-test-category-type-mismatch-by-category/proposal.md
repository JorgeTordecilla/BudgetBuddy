## Why

Current mismatch testing validates one category/type conflict path, but does not explicitly cover both mismatch directions by category type. We need deterministic coverage for `income->expense` and `expense->income` so regressions do not silently weaken the rule.

## What Changes

- Expand conflict-test coverage for category type mismatch to both directions:
  - transaction `type=income` with `category.type=expense`
  - transaction `type=expense` with `category.type=income`
- Cover both write paths:
  - `POST /transactions`
  - `PATCH /transactions/{transaction_id}` when changing `type` or `category_id`
- Assert canonical conflict ProblemDetails for every mismatch case:
  - `type=https://api.budgetbuddy.dev/problems/category-type-mismatch`
  - `title=Category type mismatch`
  - `status=409`
- Keep existing domain behavior unchanged; this change strengthens verification and guards against regressions.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `budget-domain-management`: mismatch-by-category behavior on transaction writes must be verifiable for both mismatch directions.
- `api-http-contract`: mismatch conflict tests must enforce canonical ProblemDetails consistency across mismatch cases.

## Impact

- Affected code: integration test suite for transactions.
- Affected API confidence: stronger guarantees for mismatch conflict behavior without endpoint changes.
- Affected QA: explicit matrix-style validation for category-type mismatch paths.
