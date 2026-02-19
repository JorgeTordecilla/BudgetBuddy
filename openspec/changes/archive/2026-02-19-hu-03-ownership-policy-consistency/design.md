## Context

Domain routers already perform ownership lookups for accounts, categories, and transactions. The issue is not mechanism but contract consistency: tests/specs still tolerate two outcomes (`403` or `404`), which weakens deterministic client handling.

## Decision

Use **canonical `403 Forbidden`** for non-owned resources across all scoped domain endpoints.

### Rationale

- Aligns with current implementation pattern (`forbidden_error`) and minimizes churn.
- Keeps explicit authorization semantics for authenticated users.
- Avoids mixed behavior and reduces test flakiness.

## Technical Approach

1. Centralize ownership-denial response through the shared helper in `backend/app/errors.py` (`forbidden_error`).
2. Ensure all ownership guard functions in domain routers consistently call that helper:
   - `backend/app/routers/accounts.py`
   - `backend/app/routers/categories.py`
   - `backend/app/routers/transactions.py`
3. Update OpenAPI response mappings for scoped endpoints to explicitly include `403` ProblemDetails.
4. Update/add integration tests for cross-user access matrix with exact status and canonical ProblemDetails.

## Risks and Mitigations

- Risk: one endpoint still returns a different status due to custom branch.
  - Mitigation: ownership matrix tests per resource type.
- Risk: contract drift between backend OpenAPI and OpenSpec copy.
  - Mitigation: update both `backend/openapi.yaml` and `openspec/specs/openapi.yaml`.

## Non-Goals

- No behavior change for unauthenticated requests (`401` remains as is).
- No behavior change for business rule conflicts (`409` remains as is).
- No media type changes (`application/problem+json` for errors, vendor JSON for successes).
