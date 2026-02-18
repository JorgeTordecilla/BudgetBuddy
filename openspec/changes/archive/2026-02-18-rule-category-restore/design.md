## Context

`PATCH /categories/{category_id}` already supports updates, but restore semantics (`archived_at: null`) are not explicitly specified in OpenSpec requirements. Without explicit behavior, implementations can drift on status codes, ownership handling, and media-type negotiation.

This change keeps the existing contract-first approach: business behavior in `budget-domain-management`, HTTP/media-type guarantees in `api-http-contract`, and testable scenarios aligned to integration coverage.

## Goals / Non-Goals

**Goals:**
- Specify that sending `archived_at: null` on `PATCH /categories/{category_id}` restores an archived category.
- Require `200` + `Category` payload for successful restore using `application/vnd.budgetbuddy.v1+json`.
- Define explicit restore-path error behavior for missing auth (`401`), non-owned category (`403` policy), and invalid `Accept` (`406`).
- Keep behavior compatible with existing ownership and ProblemDetails patterns.

**Non-Goals:**
- No new endpoint for restore.
- No change to category uniqueness rules or archive semantics.
- No change to global auth model or token lifecycle.
- No migration of persisted data.

## Decisions

1. Reuse `PATCH /categories/{category_id}` for restore
- Decision: restore is modeled as a normal partial update where `archived_at` is set to `null`.
- Rationale: avoids API expansion and aligns with existing patch semantics.
- Alternative considered: dedicated `/categories/{id}/restore` endpoint. Rejected to avoid duplicate behavior and additional contract surface.

2. Keep ownership policy as `403` for cross-user access
- Decision: restoring another user's category returns `403` ProblemDetails.
- Rationale: consistent with current project ownership policy in domain resources.
- Alternative considered: `404` concealment strategy. Rejected for now to preserve existing policy and avoid mixed behavior.

3. Preserve canonical media-type contract
- Decision: restore success uses vendor media type, all restore errors use `application/problem+json`.
- Rationale: consistent with OpenAPI and existing middleware/contract tests.
- Alternative considered: endpoint-specific exceptions. Rejected because it would weaken contract consistency.

4. Keep error taxonomy centralized
- Decision: restore-related failures use existing auth/forbidden/not-acceptable error paths and ProblemDetails shape.
- Rationale: keeps behavior coherent and prevents ad-hoc response payloads.

## Risks / Trade-offs

- [Patch semantics ambiguity for already-active categories] -> Mitigation: define idempotent success (`200` with category payload) when `archived_at` is already null.
- [Policy mismatch if future modules adopt 404 concealment] -> Mitigation: keep policy explicit in spec and revisit globally if strategy changes.
- [Regression in media-type enforcement] -> Mitigation: include explicit `406` and content-type assertions in integration tests.

## Migration Plan

1. Update delta specs for `budget-domain-management` and `api-http-contract`.
2. Implement restore rule in categories patch flow (if missing).
3. Add/adjust integration tests for restore happy/auth/forbidden/accept matrix.
4. Run full backend tests with coverage (`>= 90%`).

Rollback strategy:
- Revert implementation and tests for restore semantics.
- Revert delta specs if behavior should not be supported.

## Open Questions

- Should cross-user restore eventually use concealment (`404`) across all domain endpoints instead of `403`?
- Do we want an explicit ProblemDetails `type` for restore-specific business conflicts in future revisions?
