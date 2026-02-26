## Why

The frontend currently lacks a complete, contract-driven transaction management flow.
Users need to list, create, edit, restore archived transactions, and archive transactions with deterministic ProblemDetails handling.

Without this flow, BudgetBuddy cannot provide end-to-end daily ledger operations in the authenticated app experience.

## What Changes

- Add a protected transactions page at `/app/transactions`.
- Implement contract-strict transactions API wrappers (vendor media type + ProblemDetails).
- Implement create, patch, restore (`archived_at: null`), and archive (`DELETE`) UI actions.
- Reuse existing auth/API client behavior (`Authorization` bearer + `credentials: include`).
- Add canonical frontend error mapping for `400/401/403/406/409`, including specific handling for `category-type-mismatch`.
- Add tests for critical transaction flows and error mapping.

## Capabilities

### New Capabilities
- `frontend-transactions-management`: contract-driven transaction list + create/update/restore/archive user flows.

### Modified Capabilities
- `frontend-budget-setup-management` (navigation extension to include transactions entrypoint).

## Impact

- Affected code:
  - `frontend/src/api/*`
  - `frontend/src/pages/*`
  - `frontend/src/components/*`
  - `frontend/src/routes/*`
- Affected specs:
  - New delta capability for transactions frontend behavior.
- Backward compatibility:
  - No backend contract changes.
  - Existing auth/session behavior remains unchanged.
