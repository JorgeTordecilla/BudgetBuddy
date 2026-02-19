## Why

The API already enforces core contract and business rules, but minimum operational readiness is missing:
- no guaranteed request correlation id on every response,
- inconsistent operational logging context for errors,
- risk of leaking sensitive internals in error details.

HU-10 defines a minimum viable observability baseline for production debugging and safe error handling.

## What Changes

- Add `X-Request-Id` handling:
  - If request includes `X-Request-Id`, propagate it.
  - If missing, generate one and include it in response.
- Add structured logging for API errors with at least:
  - `request_id`, `path`, `status`, `problem_type`.
- Enforce error detail sanitization:
  - no stack traces, tokens, JWT payloads, or secret-like values in `ProblemDetails.detail`.
- Document `X-Request-Id` header behavior in OpenAPI.
- Add integration tests to validate request-id presence in success and error paths.

## Capabilities

### Modified Capabilities
- `api-http-contract`: document `X-Request-Id` behavior and error/header consistency.
- `problem-details-catalog`: define sanitization and logging expectations for emitted ProblemDetails.

## Impact

- Runtime: `backend/app/main.py`, `backend/app/core/errors.py` (or shared error/log module).
- Tests: `backend/tests/test_api_integration.py`.
- Contract docs: `backend/openapi.yaml`, `openspec/specs/openapi.yaml`.

No media type changes:
- success: `application/vnd.budgetbuddy.v1+json`
- errors: `application/problem+json`
