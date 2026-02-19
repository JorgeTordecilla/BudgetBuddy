## Why

The system already supports archive semantics, but retention and soft-delete behavior is not fully formalized across list/get/analytics/import flows. This creates ambiguity and potential regressions as features evolve.

## What Changes

- Standardize soft-delete (`archived_at`) behavior for accounts, categories, and transactions.
- Define default list behavior to exclude archived resources and include them only when `include_archived=true`.
- Define explicit analytics retention policy for archived transactions.
- Align OpenAPI wording for delete/archive semantics and ownership/authorization descriptions.
- Add integration tests for include/exclude toggles and analytics archived behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: Clarify archived/list/get/delete semantics and canonical wording consistency in OpenAPI.
- `budget-domain-management`: Enforce consistent include/exclude archived policy in runtime behavior across domain endpoints.
- `budget-analytics-reporting`: Define and enforce explicit archived-transaction treatment in analytics totals.

## Impact

- OpenAPI contract changes in `backend/openapi.yaml` and mirror sync in `openspec/specs/openapi.yaml`.
- Runtime behavior alignment in account/category/transaction list and query paths.
- Analytics behavior contract hardening for archived transaction inclusion/exclusion policy.
- Integration and contract tests expanded to lock archived policy and prevent regressions.
- Backward compatibility: no schema-breaking payload changes; behavior is clarified and standardized.
- Media types remain unchanged (`application/vnd.budgetbuddy.v1+json` success, `application/problem+json` errors).
