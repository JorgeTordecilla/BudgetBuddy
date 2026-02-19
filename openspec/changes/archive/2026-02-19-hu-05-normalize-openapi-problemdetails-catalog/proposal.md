## Why

The API contract is strong, but small inconsistencies in OpenAPI error descriptions and missing explicit ProblemDetails catalog entries still create drift risk between runtime and documentation. This change establishes a single source of truth for canonical error semantics so clients can rely on deterministic behavior.

## What Changes

- Normalize OpenAPI response descriptions for canonical auth/content negotiation/status patterns across routes:
- `401` as canonical Unauthorized
- `403` as canonical Forbidden for non-owned resources
- `406` as canonical Not Acceptable
- `400` invalid-cursor descriptions on paginated list endpoints
- `409` business-rule conflicts with explicit problem types where applicable
- Fix `DELETE /transactions/{transaction_id}` `403` description to match the canonical ownership wording used in other endpoints.
- Add a ProblemDetails catalog in contract docs (OpenAPI and/or companion docs) with canonical `type`, `title`, and `status` values used by runtime.
- Verify runtime emits exact canonical `type/title/status` values documented in the catalog and aligned with existing tests.

## Capabilities

### New Capabilities
- `problem-details-catalog`: Define and maintain a canonical contract-level catalog of supported ProblemDetails identifiers and semantics.

### Modified Capabilities
- `api-http-contract`: Normalize error response descriptions and document canonical ProblemDetails mappings consistently across endpoints.

## Impact

- Contract files: `backend/openapi.yaml`, `openspec/specs/openapi.yaml`, and OpenSpec capability specs under `openspec/specs/api-http-contract/spec.md`.
- Optional documentation: `README.md` or `docs/problem-details.md` if used as companion catalog location.
- Validation/runtime touchpoints: canonical error helpers and middleware/dependencies that emit `401/403/406/400/409` ProblemDetails.
- Backward compatibility: no payload shape change and no media-type change; this is a normalization/documentation hardening change for existing API behavior.
