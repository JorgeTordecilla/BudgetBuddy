## Why

Archived accounts should be immutable for new money movement. Allowing `POST /transactions` against an archived account breaks domain intent and can corrupt reporting/history expectations.

## What Changes

- Add a business validation on `POST /transactions`: if `account.archived_at != null`, reject the request.
- Return `409 Conflict` with `application/problem+json` using centralized error constants (`app/errors.py` or equivalent).
- Standardize ProblemDetails payload for this rule with:
  - `type`: `https://api.budgetbuddy.dev/problems/account-archived`
  - `title`: `Account is archived`
  - `status`: `409`
- Add integration test coverage for the end-to-end flow: create account, archive account, attempt transaction creation, assert exact ProblemDetails fields.
- Keep the existing contract behavior for all other transaction validations unchanged.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `budget-domain-management`: Transactions creation must reject archived accounts with conflict semantics.
- `api-http-contract`: Define exact ProblemDetails type/title/status for `account-archived` conflicts.

## Impact

- Affected code: transactions create service/handler, shared error constants/factory, and error-to-response mapping.
- Affected API behavior: `POST /transactions` conflict path when `account_id` points to archived account.
- Affected tests: transaction integration/contract tests asserting 409 ProblemDetails (`application/problem+json`).
