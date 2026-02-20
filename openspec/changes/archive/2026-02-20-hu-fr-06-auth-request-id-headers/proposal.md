## Why

Runtime middleware already includes `X-Request-Id` on auth responses, but `POST /auth/login`, `POST /auth/refresh`, and `POST /auth/logout` do not document that header consistently in OpenAPI. This creates contract drift for frontend/API consumers.

## What Changes

- Add `X-Request-Id` response header documentation to login/refresh/logout response mappings.
- Mirror the same contract updates in `openspec/specs/openapi.yaml`.
- Add/extend tests to assert request-id header presence on login/refresh/logout responses.

## Capabilities

### Modified Capabilities
- `api-http-contract`: auth endpoint response headers explicitly include request correlation metadata.

## Impact

- `backend/openapi.yaml`
- `openspec/specs/openapi.yaml`
- `backend/tests/test_api_integration.py`
- `backend/tests/test_contract_openapi.py`
