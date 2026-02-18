## 1. Project setup and persistence

- [x] 1.1 Define backend module structure for auth, accounts, categories, transactions, analytics, and shared http-contract components
- [x] 1.2 Add and configure FastAPI, pydantic, DB driver/ORM, JWT, password hashing, and migration dependencies
- [x] 1.3 Implement Neon Postgres connection settings and environment configuration
- [x] 1.4 Create initial migrations for users, refresh_tokens, accounts, categories, and transactions tables with required constraints and indexes

## 2. HTTP contract and error semantics

- [x] 2.1 Implement shared response utilities that always emit `application/vnd.budgetbuddy.v1+json` for successful JSON responses
- [x] 2.2 Implement global `ProblemDetails` model and exception handlers that emit `application/problem+json`
- [x] 2.3 Implement Accept header validation returning `406` `ProblemDetails` for unsupported media types
- [x] 2.4 Implement request body content-type validation and standardized bad-request validation responses
- [x] 2.5 Add tests covering media type negotiation, `ProblemDetails` shape, and 204 no-body behavior

## 3. Auth and session management

- [x] 3.1 Implement `POST /auth/register` with schema validation, password hashing, user creation, and `AuthResponse`
- [x] 3.2 Implement `POST /auth/login` with credential verification and token issuance
- [x] 3.3 Implement JWT access token generation and verification dependencies for protected routes
- [x] 3.4 Implement refresh token persistence, expiration, rotation/revocation checks, and `POST /auth/refresh`
- [x] 3.5 Implement `POST /auth/logout` to revoke refresh tokens and return `204`
- [x] 3.6 Add integration tests for auth success and failure status codes (`400/401/403/409`) and payload contracts

## 4. Accounts, categories, and transactions

- [x] 4.1 Implement accounts endpoints (`GET/POST /accounts`, `GET/PATCH/DELETE /accounts/{account_id}`) with ownership and archive rules
- [x] 4.2 Implement categories endpoints (`GET/POST /categories`, `GET/PATCH/DELETE /categories/{category_id}`) with type filter and uniqueness-by-type rules
- [x] 4.3 Implement transactions endpoints (`GET/POST /transactions`, `GET/PATCH/DELETE /transactions/{transaction_id}`) with business-rule conflict handling
- [x] 4.4 Implement cursor pagination and filtering for list endpoints (`include_archived`, domain filters, date range filters)
- [x] 4.5 Add authorization checks that return `403` for inaccessible owned resources per contract
- [x] 4.6 Add integration tests for all domain endpoints including pagination, filters, archive semantics, and `401/403/409` behavior

## 5. Analytics and contract verification

- [x] 5.1 Implement `GET /analytics/by-month` aggregate query and response mapping
- [x] 5.2 Implement `GET /analytics/by-category` aggregate query and response mapping
- [x] 5.3 Implement analytics date-range validation and error handling for invalid requests
- [x] 5.4 Add analytics tests for success and auth/validation failures (`200/400/401/406`)
- [x] 5.5 Add end-to-end contract tests validating all endpoints against `backend/openapi.yaml` status codes, headers, and response shapes
- [x] 5.6 Document migration/deployment/rollback steps for Neon-backed production rollout
