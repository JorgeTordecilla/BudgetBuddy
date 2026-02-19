## Context

Transaction list endpoints are integration-critical and currently rely on partially implicit ordering/filter behavior. HU-08 makes list semantics explicit in the contract and aligns runtime behavior with deterministic sort and canonical invalid-range errors.

## Goals / Non-Goals

**Goals:**
- Define and enforce deterministic sorting for `GET /transactions` (`date desc`, tie-breaker `created_at desc`).
- Make combined filter behavior explicit and test-backed.
- Return canonical `400` ProblemDetails for invalid transaction date ranges (`from > to`).
- Keep media types contract-first: vendor type on success, `application/problem+json` on errors.

**Non-Goals:**
- Introduce new pagination model beyond current cursor approach.
- Change business-rule conflicts (`409`) unrelated to list querying.
- Add cross-resource sorting contracts outside transaction listing.

## Decisions

- Decision: Use `date desc` + `created_at desc` as canonical ordering for `GET /transactions`.
  - Rationale: preserves “most recent first” while removing tie instability.
  - Alternative considered: tie-break by `id desc`; rejected to avoid coupling order semantics to UUID generation behavior.

- Decision: Treat combined filters as conjunctive (AND) in one effective predicate.
  - Rationale: deterministic client expectations and easier test matrix definition.
  - Alternative considered: independent precedence rules; rejected as ambiguous for consumers.

- Decision: Introduce canonical invalid-range `400` ProblemDetails (`invalid-date-range`).
  - Rationale: avoids generic validation ambiguity and hardens client recovery behavior.
  - Alternative considered: keep current implicit behavior; rejected due to integration flakiness risk.

- Decision: Fail fast on invalid range before list query execution.
  - Rationale: avoids unnecessary DB work and keeps error deterministic.

## Risks / Trade-offs

- [Risk] Existing clients may rely on previous implicit tie ordering.
  ? Mitigation: document ordering in OpenAPI and add deterministic tests.

- [Risk] New invalid-range rule can change observed behavior from permissive to strict.
  ? Mitigation: use canonical ProblemDetails and clear contract wording.

- [Risk] Cursor generation/decoding may depend on previous sort assumptions.
  ? Mitigation: align cursor comparator fields with documented ordering and verify with integration tests.

## Migration Plan

1. Update OpenSpec and OpenAPI contract text for ordering/filter/range semantics.
2. Implement/confirm runtime ordering and invalid-range validation in transactions list path.
3. Align pagination cursor comparator fields with final order if required.
4. Add integration tests for ordering ties, combined filters, and invalid ranges.
5. Run backend test suite with coverage threshold `>= 90%`.

## Open Questions

- Should invalid date range be applied to analytics endpoints (`/analytics/by-month`, `/analytics/by-category`) in a follow-up change for consistency?
