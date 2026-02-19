## Context

`DELETE /transactions/{transaction_id}` archives by setting `archived_at`. To provide full lifecycle parity with categories, transactions need explicit restore semantics through patch operations.

## Decision

Use `PATCH /transactions/{transaction_id}` with payload field `archived_at: null` as restore command.

## Behavior

- Owner + valid token + supported Accept:
  - archived transaction -> restored (`archived_at=null`) and `200` vendor response.
  - already active transaction -> no-op, still `200` vendor response (idempotent).
- Non-owner:
  - canonical `403` ProblemDetails.
- Missing/invalid bearer:
  - canonical `401` ProblemDetails.
- Unsupported `Accept`:
  - canonical `406` ProblemDetails.

## Implementation Notes

- Reuse existing ownership guard in transactions router.
- No new endpoint needed; patch path already exists.
- Ensure patch flow does not enforce conflict for restore no-op.

## Risks / Mitigations

- Risk: restore path accidentally triggers unrelated business-rule checks.
  - Mitigation: add focused tests for restore happy/idempotent paths.
- Risk: contract drift between backend and OpenSpec mirror.
  - Mitigation: update both OpenAPI files in same change.
