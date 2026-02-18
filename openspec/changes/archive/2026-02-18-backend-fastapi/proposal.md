## Why

The project already defines a complete API contract in `backend/openapi.yaml`, but the backend implementation is not yet aligned end-to-end with that contract. We need a FastAPI + Postgres (Neon) implementation now so frontend and integrations can rely on stable behavior, media types, and error semantics.

## What Changes

- Implement a FastAPI backend whose request/response behavior is contract-first from `backend/openapi.yaml`.
- Enforce media type negotiation for `application/vnd.budgetbuddy.v1+json` on success payloads and `application/problem+json` for errors.
- Implement RFC7807-style `ProblemDetails` mapping for validation, auth, business, and not-acceptable errors.
- Implement auth flows: register, login, refresh, logout with JWT access token and revocable refresh tokens.
- Implement CRUD + archive/list behavior for accounts, categories, and transactions, including filters and cursor pagination where defined.
- Implement analytics endpoints by month and by category using transaction aggregates over date ranges.
- Use Postgres on Neon for persistence, constraints, and indexes required by API behavior.

## Capabilities

### New Capabilities
- `api-http-contract`: Enforce OpenAPI contract semantics, media-type negotiation, and `ProblemDetails` error envelope.
- `auth-session-management`: Register/login/refresh/logout with JWT access tokens and refresh-token revocation.
- `budget-domain-management`: Accounts, categories, and transactions endpoints with ownership, archive rules, filtering, and pagination.
- `budget-analytics-reporting`: By-month and by-category analytics endpoints with validated date ranges and aggregate totals.

### Modified Capabilities
- None.

## Impact

- Affected code: FastAPI app structure, routers, pydantic schemas, auth services, repositories, and middleware.
- Affected API: All endpoints in `backend/openapi.yaml` must become executable and contract-compliant.
- Data layer: New Postgres schema/migrations (users, refresh_tokens, accounts, categories, transactions) and aggregate queries.
- Dependencies: FastAPI stack, Postgres driver/ORM, JWT and password-hash libraries, migration tooling.
- Operations: Neon environment configuration, secrets for JWT signing, migration/runbook updates.
