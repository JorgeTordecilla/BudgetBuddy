## Why

Restoring archived categories is a common user action (for reused budgets, seasonal categories, or accidental archives) and currently lacks an explicit contract rule. Defining restore behavior now prevents inconsistent API responses and locks authorization/negotiation expectations before implementation.

## What Changes

- Define that `PATCH /categories/{category_id}` with `archived_at: null` restores an archived category.
- Require successful restore response as `200` with `Category` payload (`application/vnd.budgetbuddy.v1+json`).
- Add contract scenarios for restore authorization and access control:
  - No token -> `401` ProblemDetails.
  - Other user's category -> forbidden strategy (`403` as current ownership pattern, or documented `404/403` policy if changed).
- Add contract scenario for content negotiation: invalid `Accept` -> `406` ProblemDetails.
- No breaking API shape changes; behavior is a rule clarification for existing endpoint.


## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `budget-domain-management`: add restore semantics for archived categories via `PATCH /categories/{category_id}` and expected success/error outcomes.
- `api-http-contract`: add explicit media-type and status-code expectations for category restore flows (`200`, `401`, `403`, `406`).

## Impact

- API surface: `PATCH /categories/{category_id}` behavior clarified for `archived_at` transitions.
- OpenAPI/spec alignment: reinforces `application/vnd.budgetbuddy.v1+json` on success and `application/problem+json` on errors.
- Backend code likely affected: categories router/business-rule validation and ownership checks.
- Tests affected: integration matrix for happy path, auth failure, cross-user access, and `Accept` negotiation.

## Contract Decisions (to remove ambiguity)

- **Idempotent restore:** `PATCH /categories/{category_id}` with `archived_at: null` MUST return `200` and the `Category` payload even if the category is already active (`archived_at` already null).
- **Patch composition:** The same `PATCH` request MAY include other updatable fields (e.g. `name`, `note`) alongside `archived_at: null`; existing validations apply (e.g. name conflicts still return `409` ProblemDetails).
- **Authorization policy:** Accessing another user’s category MUST return `403` (consistent with current ownership pattern) with `application/problem+json`.
