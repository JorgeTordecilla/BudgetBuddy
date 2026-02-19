## Why

Money errors are high severity because they directly affect balances, analytics correctness, and user trust. This change is needed now to enforce strict `amount_cents` and `currency_code` invariants without breaking the API v1 contract.

## What Changes

- Harden money validation rules for transaction create/patch:
  - `amount_cents` must be an integer.
  - enforce safe bounds to prevent absurd values/overflow.
  - reject zero/sign-invalid amounts based on domain rules.
- Enforce user currency consistency (`currency_code`) in money write paths and analytics aggregation context.
- Ensure analytics totals remain deterministic integer cents (no floating-point rounding behavior).
- Standardize money validation failures as canonical `400` `ProblemDetails` responses (`application/problem+json`).
- Keep existing media-type contract unchanged:
  - success: `application/vnd.budgetbuddy.v1+json`
  - errors: `application/problem+json`
- No expected **BREAKING** API contract changes; domain validation becomes stricter for invalid payloads.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `budget-domain-management`: strengthen transaction money invariants (`amount_cents`, sign rules, safe bounds, currency consistency) for create/patch behavior.
- `budget-analytics-reporting`: require integer-cents-only aggregation semantics with consistent currency context.
- `problem-details-catalog`: define canonical money-validation `400` ProblemDetails behavior and sanitization expectations.
- `api-http-contract`: preserve media types and HTTP contract while tightening validation semantics for invalid money inputs.

## Impact

- OpenAPI paths impacted:
  - `POST /transactions`
  - `PATCH /transactions/{transaction_id}`
  - `GET /analytics/by-month`
  - `GET /analytics/by-category`
- OpenAPI components impacted:
  - `#/components/schemas/TransactionCreate`
  - `#/components/schemas/TransactionUpdate`
  - `#/components/schemas/Transaction`
  - `#/components/schemas/AnalyticsByMonthResponse`
  - `#/components/schemas/AnalyticsByCategoryResponse`
  - `#/components/schemas/ProblemDetails`
- Affected code:
  - transaction domain validation paths
  - analytics aggregation paths
  - integration tests
- Backward compatibility:
  - no route or media-type changes
  - previously tolerated invalid payloads may now return canonical `400`

## Definition of Done

- Money invariants are enforced consistently in transaction create/patch and analytics totals.
- Integration tests cover invalid amount/currency cases and assert canonical `400` `ProblemDetails`.
- No OpenAPI/media-type contract regressions.

## NFR

- Security: validation failures must not leak stack traces or internal exception details.
- Correctness: deterministic integer-cents behavior only (no floating-point rounding).
