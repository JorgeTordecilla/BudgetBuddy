## Context

The API already emits ProblemDetails with correct media type, but 401/403/406 values are often constructed inline. This creates risk of drift in `type/title/status`, especially in auth and ownership paths where tests historically only asserted status/media type.

## Goals / Non-Goals

**Goals:**
- Define canonical constants + helper builders for `401`, `403`, `406` ProblemDetails.
- Ensure `enforce_accept_header`, `get_current_user`, and ownership checks use those helpers.
- Strengthen restore category tests to assert exact canonical fields.

**Non-Goals:**
- No endpoint additions or status-code changes.
- No change to success payload media-type handling.
- No redesign of error middleware.

## Decisions

1. Centralize authz/negotiation ProblemDetails in `app/errors.py`
- Decision: add constants + helper functions for `unauthorized`, `forbidden`, `not acceptable`.
- Rationale: single source of truth for contract values.

2. Keep ownership policy on 403
- Decision: `_owned_*_or_403` continues returning `403`, now canonicalized via helper.
- Rationale: aligns current domain policy and existing specs.

3. Assert exact canonical fields in restore matrix
- Decision: restore tests for 401/403/406 assert exact `type/title/status`.
- Rationale: prevents accidental regressions in ProblemDetails contracts.

## Risks / Trade-offs

- [Potential mismatch with older implicit `about:blank`] -> Mitigation: canonical constants codify stable URLs and titles.
- [Touching shared dependencies can affect many endpoints] -> Mitigation: keep changes small and run full test suite + coverage.
