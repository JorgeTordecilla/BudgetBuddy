## Context

The implementation target is a FastAPI backend backed by Postgres on Neon, using `backend/openapi.yaml` as the source of truth for routes, schemas, status codes, and media types. The API must always emit `application/vnd.budgetbuddy.v1+json` for successful bodies and `application/problem+json` with `ProblemDetails` for error bodies. Core complexity is cross-cutting: auth/session security, strict content negotiation, ownership enforcement, archive semantics, pagination, and analytics aggregates.

## Goals / Non-Goals

**Goals:**
- Implement all endpoints defined in `backend/openapi.yaml` with contract-first behavior.
- Enforce response/request media type handling, including 406 for invalid `Accept` and 400 for invalid body contract.
- Standardize all non-204 errors through a single `ProblemDetails` builder and exception mapping layer.
- Implement auth with hashed passwords, short-lived JWT access tokens, rotating/revocable refresh tokens, and logout revocation.
- Implement domain modules for accounts, categories, and transactions with per-user ownership and business-rule validations.
- Implement analytics endpoints with deterministic aggregate SQL over date ranges.

**Non-Goals:**
- Multi-tenant org/team model beyond single user ownership of resources.
- Additional API versions beyond media type `v1`.
- Real-time push/streaming analytics.
- UI/client changes (this change is backend and contract compliance only).

## Decisions

1. Contract-first architecture by bounded module
- Decision: split backend into modules (`auth`, `accounts`, `categories`, `transactions`, `analytics`, `http_contract`) with routers + service + repository layers.
- Rationale: keeps OpenAPI-aligned endpoint behavior isolated while sharing infra (db session, errors, auth dependency).
- Alternative considered: monolithic router/service file. Rejected due to poor maintainability and risk of inconsistent semantics.

2. Pydantic schemas mapped 1:1 from OpenAPI
- Decision: create request/response models that mirror schema names and constraints from OpenAPI.
- Rationale: minimizes drift, enables schema-level validation and predictable serialization.
- Alternative considered: internal-only domain models with ad-hoc DTO transforms. Rejected due to extra mapping complexity and drift risk.

3. Media-type enforcement middleware + response helpers
- Decision: implement a middleware/dependency that validates `Accept` and `Content-Type` for relevant operations, and central response helpers for success/error media types.
- Rationale: guarantees consistent headers across all endpoints.
- Alternative considered: per-endpoint manual checks. Rejected because it is repetitive and error-prone.

4. ProblemDetails as global error contract
- Decision: create a shared `ProblemDetails` model and exception handlers for validation, auth, forbidden, conflict, and generic errors.
- Rationale: consistent RFC7807-style payload and easier test coverage for expected failures.
- Alternative considered: returning framework default error payloads. Rejected because it violates the API contract.

5. Postgres + migrations as source of persistence truth
- Decision: define explicit tables and constraints (`users`, `refresh_tokens`, `accounts`, `categories`, `transactions`) with indexes on user/date/filter fields and archive fields.
- Rationale: contract requires filtering, pagination, uniqueness, and aggregate performance; these must be enforced in DB.
- Alternative considered: in-memory/SQLite first then migrate. Rejected because Neon/Postgres behavior is part of production target.

6. Cursor pagination strategy
- Decision: use opaque base64 cursor encoding stable sort keys (for lists: created_at+id or date+id depending on resource).
- Rationale: supports deterministic pagination and aligns with `next_cursor` contract.
- Alternative considered: offset pagination. Rejected due to unstable ordering and poor scalability.

7. Auth token strategy
- Decision: JWT access token with user claims and expiration; refresh token persisted (hashed/token-id) with revocation and rotation metadata.
- Rationale: supports refresh/logout semantics, 401 vs 403 flows, and session invalidation.
- Alternative considered: stateless refresh JWT only. Rejected because revocation/logout becomes weak.

## Risks / Trade-offs

- [Contract drift between code and OpenAPI] -> Mitigation: contract tests per endpoint validating status, headers, and shape against OpenAPI-derived fixtures.
- [Complexity from strict content negotiation] -> Mitigation: central middleware/helpers and dedicated tests for 406/415 style paths.
- [Refresh token security flaws] -> Mitigation: hash or token-id persistence, rotation rules, expiration checks, and audit fields.
- [Analytics query performance degradation] -> Mitigation: indexes on `(user_id, date)` and `(user_id, category_id, date)`, query plan checks on Neon.
- [Ambiguous 403 vs not found behavior] -> Mitigation: explicit rule: inaccessible resource returns 403 as defined in contract text.

## Migration Plan

1. Introduce project structure, settings, db connection, migration tooling, and baseline migrations for all required tables.
2. Add shared HTTP-contract layer (media-type guard, ProblemDetails handlers, common response helpers).
3. Implement auth module and endpoints with integration tests.
4. Implement accounts/categories/transactions modules with business rules and pagination tests.
5. Implement analytics module with aggregate tests.
6. Run OpenAPI contract compliance tests and fix mismatches.
7. Deploy migrations to Neon, deploy app, and monitor error-rate by status class.

Rollback strategy:
- If deployment fails, roll back app release and DB migration batch for newly introduced objects where safe.
- Preserve backward compatibility by not partially enabling routes without passing contract tests.

## Open Questions

- Should refresh tokens be one-active-per-device or multiple-active sessions per user by default?
- Should cursor sort key for transactions prioritize `date` then `id` or `created_at` then `id` when filters are mixed?
- Is `415 Unsupported Media Type` expected for wrong `Content-Type`, or should those cases be normalized to 400 in this API version?
