## Context

The backend already enforces category/type mismatch conflicts and emits canonical ProblemDetails, but existing tests can miss one mismatch direction or one write path. This change adds explicit matrix coverage by category type to lock behavior.

## Goals / Non-Goals

**Goals:**
- Add deterministic tests for mismatch-by-category in both directions (`income<->expense`).
- Validate both create (`POST`) and update (`PATCH`) paths.
- Ensure every mismatch assertion checks canonical ProblemDetails and `application/problem+json`.

**Non-Goals:**
- No API behavior change.
- No schema, migration, or persistence changes.
- No broad refactor of transaction service logic.

## Decisions

1. Matrix-oriented integration tests
- Decision: represent mismatch coverage as explicit directional scenarios instead of one generic case.
- Rationale: prevents false confidence from single-path coverage.
- Alternative considered: unit-level parameterized checks only. Rejected because endpoint-level contract fields must be verified too.

2. Reuse existing helper setup in integration suite
- Decision: build on existing account/category/transaction creation patterns in `test_api_integration.py`.
- Rationale: keeps tests concise and aligned with current project style.
- Alternative considered: new fixtures/modules. Rejected for unnecessary scope in this change.

3. Keep assertions contract-focused
- Decision: assert status, media type, and exact `type/title/status` for mismatch conflicts.
- Rationale: maximizes compatibility confidence for clients.
- Alternative considered: asserting only status code. Rejected because it misses contract regressions.

## Risks / Trade-offs

- [Longer integration test runtime] -> Mitigation: keep dataset minimal and reuse setup patterns.
- [Test duplication] -> Mitigation: organize cases clearly and keep payload deltas small.
- [Brittle assertions if messages change] -> Mitigation: canonical fields are intentionally stable contract values.

## Migration Plan

1. Add directional mismatch test cases for `POST`.
2. Add directional mismatch test cases for `PATCH`.
3. Run full test suite with coverage and verify no regressions.
4. Keep rollback simple by reverting only test additions if needed.

## Open Questions

- Should we migrate these directional checks into parametrized test utilities in a follow-up cleanup change?
