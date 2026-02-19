## Why

Operational incidents and support escalations need a reliable history of who changed what and when. Without an audit trail, debugging security-sensitive flows and state transitions is slow and error-prone.

## What Changes

- Add persistent audit-event recording for mutation flows: create, update, archive, restore, logout, and refresh-token reuse detection.
- Add an `AuditEvent` data model with core fields: `request_id`, `user_id`, `resource_type`, `resource_id`, `action`, and `created_at`.
- Add indexing optimized for user-scoped chronological lookup (`user_id`, `created_at`).
- Wire audit emission into accounts/categories/transactions/auth runtime paths.
- Enforce secure audit payload policy (no raw tokens, secrets, or sensitive auth artifacts).
- Add owner-scoped audit read endpoint: `GET /audit?from&to&cursor&limit` with deterministic pagination and canonical ProblemDetails errors.
- Keep existing API media-type policy unchanged.

## Capabilities

### New Capabilities
- `audit-trail`: Defines audit event schema, emission rules, sensitive-data redaction, and owner-scoped audit query behavior.

### Modified Capabilities
- `api-http-contract`: Add `/audit` path contract (query parameters, pagination, response mapping, and canonical error responses).
- `problem-details-catalog`: Extend/confirm canonical errors used by audit queries (invalid cursor, invalid date range, unauthorized/forbidden, not acceptable).
- `auth-session-management`: Add requirements for emitting audit events on logout and refresh-token reuse security events.
- `budget-domain-management`: Add requirements for emitting audit events on account/category/transaction mutation actions.

## Impact

- OpenAPI updates in `backend/openapi.yaml` and mirror updates in `openspec/specs/openapi.yaml`.
- Impacted OpenAPI paths:
  - `GET /audit` (new)
  - Existing mutation/auth paths for behavioral requirements (no response schema break):
    - `/accounts`
    - `/accounts/{account_id}`
    - `/categories`
    - `/categories/{category_id}`
    - `/transactions`
    - `/transactions/{transaction_id}`
    - `/auth/logout`
    - `/auth/refresh`
- Impacted OpenAPI components:
  - New schemas for audit payload/list response and pagination metadata.
  - Existing `ProblemDetails` usage and `components/x-problem-details-catalog` alignment for canonical errors.
- Backend impact:
  - New persistence model/table and index for audit events.
  - Runtime instrumentation in mutation/auth flows with low-overhead writes.
  - Redaction/serialization safeguards to prevent token or secret leakage.
- Test impact:
  - Integration tests asserting audit events are created for key actions.
  - Security tests asserting sensitive values are never persisted.
  - Pagination and canonical error tests for `GET /audit`.
- Backwards compatibility:
  - Additive change; existing endpoint request/response contracts remain stable.
- Media-type impact:
  - Success responses remain `application/vnd.budgetbuddy.v1+json`.
  - Error responses remain `application/problem+json`.
