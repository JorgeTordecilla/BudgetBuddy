## Context

BudgetBuddy uses a contract-first workflow with `backend/openapi.yaml` as the primary source and `openspec/specs/openapi.yaml` as the mirror. Runtime already emits canonical ProblemDetails for many paths (`401/403/406`, cursor `400`, business conflicts `409`), but there are small wording inconsistencies in OpenAPI and no explicit catalog section that acts as a single source of truth for canonical `type/title/status`.

This change removes contract drift without changing payload shape or media types:
- Success: `application/vnd.budgetbuddy.v1+json`
- Error: `application/problem+json`

## Goals / Non-Goals

**Goals:**
- Normalize OpenAPI error descriptions for `400/401/403/406/409`.
- Apply the concrete fix for `DELETE /transactions/{transaction_id}` `403` description.
- Document a canonical ProblemDetails catalog and keep it aligned with runtime helpers.
- Verify existing tests cover canonical values; add minimal tests only if coverage gaps exist.

**Non-Goals:**
- No business-rule behavior changes.
- No auth policy changes.
- No payload schema or media-type changes.

## Decisions

### Decision 1: OpenAPI remains the canonical catalog source
Canonical ProblemDetails catalog entries are documented directly in OpenAPI (and mirrored in OpenSpec), optionally with companion docs for readability.

Rationale:
- Keeps client-facing source of truth in the contract.
- Avoids hidden coupling to implementation-only constants.

Alternatives:
- Catalog only in runtime code: rejected, weak for API consumers.
- Catalog only in README/docs: rejected, high drift risk from contract.

### Decision 2: Normalize wording by status class
OpenAPI descriptions are standardized for:
- `401` Unauthorized
- `403` Forbidden for non-owned resources
- `406` Not Acceptable
- `400` Invalid cursor on paginated lists
- `409` Business conflicts with canonical type mappings

Rationale:
- Deterministic client behavior and better support tooling.
- Removes inconsistent phrases such as "Not allowed (or not found)".

Alternatives:
- Leave endpoint-specific wording: rejected, continues inconsistency.

### Decision 3: Validate catalog-to-runtime parity
Canonical runtime emitters (`app/errors.py`, auth/ownership/cursor paths) are checked against the catalog values.

Rationale:
- Ensures `type/title/status` parity between docs and runtime behavior.

Alternatives:
- Contract-only validation: rejected, does not verify runtime output.

## Risks / Trade-offs

- [Risk] Catalog and runtime constants drift in future changes.
  - Mitigation: include parity check tasks and keep tests asserting exact canonical values.
- [Risk] Main and mirror OpenAPI diverge.
  - Mitigation: update `backend/openapi.yaml` and `openspec/specs/openapi.yaml` atomically.
- [Trade-off] More explicit documentation needs upkeep.
  - Mitigation: keep one canonical catalog location and avoid duplicate conflicting docs.

## Migration Plan

1. Normalize error descriptions in both OpenAPI files.
2. Apply the specific `DELETE /transactions/{transaction_id}` `403` wording fix.
3. Add/update canonical ProblemDetails catalog entries in contract docs.
4. Validate runtime helpers and key paths emit exact canonical fields.
5. Run tests with coverage from `backend/.venv` and keep `>= 90%`.

Rollback:
- Revert the HU-05 commit if needed; no data migration is involved.

## Open Questions

- Should we keep the catalog only in OpenAPI or also publish a `docs/problem-details.md` view?
- Should future `409` additions require explicit canonical `type` entries before implementation?
