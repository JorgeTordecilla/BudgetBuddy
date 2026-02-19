## Why

Several OpenAPI `application/problem+json` responses currently use mismatched examples (for example, an `invalid-date-range` example on cursor errors). This causes frontend error mapping drift and can produce incorrect UI behavior, so contract examples must be made canonical now that error handling and SDK usage are expanding.

## What Changes

- Clean up endpoint-level `application/problem+json` examples so each response maps to the correct canonical ProblemDetails identity (`type`, `title`, `status`).
- Enforce response-example mapping by use case:
  - `400 invalid-cursor` only on cursor-based list endpoints.
  - `400 invalid-date-range` only where `from`/`to` validation applies.
  - `409` examples aligned to domain conflicts (`account-archived`, `category-archived`, `category-type-mismatch`, `budget-duplicate`, etc.).
  - `401 unauthorized`, `403 forbidden`, `406 not-acceptable`, and `429 rate-limited` only where those responses are declared.
- Normalize reuse by referencing shared catalog examples via `components/examples` and/or catalog-backed reusable components, avoiding duplicated and drifting inline examples.
- Ensure `429` docs include `Retry-After` response header where rate limiting is documented.
- Preserve existing media types and endpoint shapes; this change only corrects documentation examples and response-header documentation.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `api-http-contract`: Tighten endpoint-level ProblemDetails example correctness and response-to-example mapping across documented error responses.
- `problem-details-catalog`: Strengthen canonical example reuse and ensure endpoint references align with the catalog identities.
- `openapi-quality-gates`: Extend/clarify OpenAPI quality expectations so misleading ProblemDetails examples are prevented from drifting back.

## Impact

- OpenAPI contract files:
  - `backend/openapi.yaml`
  - `openspec/specs/openapi.yaml`
- Impacted OpenAPI areas: error responses on list/auth/domain endpoints using `application/problem+json`, relevant `responses` sections, `components/examples`, and canonical catalog references.
- Backwards compatibility: no runtime behavior changes and no response payload schema changes.
- Media type impact: no changes (`application/vnd.budgetbuddy.v1+json` success and `application/problem+json` errors remain unchanged).
- Tooling/CI: OpenAPI validation and any spec-quality checks remain green; SDK regeneration only if current pipeline treats example updates as generated-artifact inputs.
