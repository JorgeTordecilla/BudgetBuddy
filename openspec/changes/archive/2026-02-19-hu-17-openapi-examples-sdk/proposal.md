## Why

Frontend and integration consumers need realistic API examples and typed clients to reduce integration bugs and onboarding time. Without examples and generated SDKs, clients are hand-written and drift from the contract.

## What Changes

- Add OpenAPI examples for all endpoints with at least one success example and one error example per operation.
- Add canonical ProblemDetails examples for `400`, `401`, `403`, `406`, `409`, and `429`.
- Add deterministic SDK generation for TypeScript and Python from `backend/openapi.yaml`.
- Add pinned OpenAPI generator configuration and versioned generation scripts.
- Add CI checks to validate OpenAPI and fail when generated SDK outputs are stale.
- Add developer documentation for local validation and SDK regeneration.

## Capabilities

### New Capabilities
- `sdk-generation`: Deterministic TS/Python SDK generation workflow with pinned generator versions and reproducible outputs.
- `openapi-quality-gates`: CI quality gates for OpenAPI validation and generated-SDK drift detection.

### Modified Capabilities
- `api-http-contract`: Add requirements for operation examples in OpenAPI, including success and error examples.
- `problem-details-catalog`: Add requirements for canonical reusable ProblemDetails examples across error classes.

## Impact

- OpenAPI updates in `backend/openapi.yaml` and mirror updates in `openspec/specs/openapi.yaml`.
- New tooling/configuration for SDK generation and generated outputs under `sdk/typescript/` and `sdk/python/`.
- CI workflow updates for OpenAPI validation and SDK regeneration diff checks.
- Documentation updates for local developer commands and pinned tool versions.
- Backward compatibility: additive documentation/tooling only; no existing endpoint behavior regression intended.
- Media-type alignment remains unchanged:
  - Success examples use `application/vnd.budgetbuddy.v1+json`.
  - Error examples use `application/problem+json`.
