## Why

BudgetBuddy now relies on HttpOnly refresh cookies for web auth, but production will be cross-site. Without explicit CORS credentials policy and allowed origins, browsers will not send refresh cookies and auth flows will fail in real frontend deployments.

## What Changes

- Add an explicit cross-site CORS policy for API responses and preflight handling:
  - `allow_origins` from environment list (no wildcard)
  - `allow_credentials=true`
  - `allow_methods=GET,POST,PATCH,DELETE,OPTIONS`
  - `allow_headers=Authorization,Content-Type,Accept,X-Request-Id`
  - `expose_headers=X-Request-Id,Retry-After`
- Define development defaults for frontend origin `http://localhost:5173` against API `http://localhost:8000`.
- Add runtime configuration for environment-driven CORS origins and deterministic parsing.
- Add integration tests for preflight and real requests with Origin header to verify credentialed CORS behavior.
- Align OpenAPI/contract notes to document cross-site cookie + CORS expectations for frontend integrations.
- No media-type changes: successful responses remain `application/vnd.budgetbuddy.v1+json`, errors remain `application/problem+json`.

## Capabilities

### New Capabilities
- `cors-credentials-policy`: Define and enforce credentialed CORS policy for cross-site web clients, including preflight behavior and environment-driven origin allowlist.

### Modified Capabilities
- `api-http-contract`: Document and enforce HTTP contract requirements for CORS credential headers, allowed origins, and exposed operational headers relevant to cookie-based auth.

## Impact

- Backend runtime: CORS middleware wiring in `backend/app/main.py` and configuration in `backend/app/core/config.py` (or equivalent settings module).
- Auth/browser interoperability: cookie-based refresh flows in cross-site frontend deployments.
- Tests: integration coverage for OPTIONS preflight and Origin-based credentialed requests.
- Contract/docs: `backend/openapi.yaml` and `openspec/specs/openapi.yaml` descriptive updates for CORS and exposed headers.
