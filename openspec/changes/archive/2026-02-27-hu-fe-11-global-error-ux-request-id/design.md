## Context

The backend contract already standardizes errors as `application/problem+json` and provides `X-Request-Id` for observability. Frontend screens currently handle errors in multiple ad-hoc ways, with duplicated mapping logic and inconsistent user feedback. This design introduces a contract-first, global error UX layer that pages can consume consistently.

## Goals / Non-Goals

**Goals:**
- Normalize all frontend API failures into one typed error model.
- Centralize canonical `problem.type` mapping into deterministic UX decisions.
- Provide reusable inline + toast components with request-id visibility/copy support.
- Integrate with React Query global handlers while preserving local page affordances.
- Ensure safe fallback behavior for unknown or potentially sensitive backend detail.

**Non-Goals:**
- Rewriting all page layouts or introducing a new design system.
- Introducing multi-language i18n framework changes.
- Modifying backend endpoints or ProblemDetails format.

## Decisions

1. Error taxonomy and normalization
- Decision: introduce `ApiProblemError`, `ApiUnknownError`, and `ApiNetworkError` under a shared `toApiError(...)` pathway.
- Rationale: one parser prevents inconsistent per-page behavior.
- Alternative considered: keep parser logic inside each API module; rejected due to duplication and drift.

2. Canonical mapping catalog
- Decision: maintain a single `problemMapping` dictionary keyed by canonical `problem.type` that returns `{ message, presentation }`.
- Rationale: guarantees deterministic UX and easy audit.
- Alternative considered: map by HTTP status only; rejected because type-specific conflicts need distinct messages.

3. Request-id surfacing
- Decision: include request id in all rendered error UIs when available, with copy action in both toast and inline components.
- Rationale: directly supports support/debug workflows.
- Alternative considered: show request id only in dev tools; rejected because end users cannot reliably share correlation ids.

4. Query/mutation presentation policy
- Decision: query failures are inline-first; mutation failures are toast-first plus optional inline form context. Mapping can override to `toast`, `inline`, or `both`.
- Rationale: balances discoverability and context relevance.
- Alternative considered: toast-only global policy; rejected due to poor page recoverability for data-load failures.

5. Safe detail policy
- Decision: show raw `detail` only for known mapped types; unknown types fallback to safe message.
- Rationale: reduce risk of leaking internal backend detail in UI.
- Alternative considered: always render detail; rejected for security and UX consistency.

6. React Query integration boundary
- Decision: global QueryClient `onError` handles toast dispatch and classification, while pages retain control of inline rendering and retry controls.
- Rationale: preserves local UX context while centralizing cross-cutting behavior.
- Alternative considered: fully global rendering with no page-level error UI; rejected as too rigid.

## Risks / Trade-offs

- [Risk] Incomplete adoption leaves mixed old/new error UX.
  - Mitigation: migrate critical routes first (transactions, budgets, analytics), then apply sweep.
- [Risk] Overly broad fallback messages may hide useful context.
  - Mitigation: expand canonical type catalog iteratively based on observed backend types.
- [Risk] Clipboard APIs may fail in restricted browsers.
  - Mitigation: provide deterministic failure feedback and non-throwing fallback behavior.
- [Risk] Global onError and local handlers may both fire duplicate toasts.
  - Mitigation: include suppression flag in normalized error metadata or local mutation options.

## Migration Plan

1. Introduce shared error normalization types and parsing utility.
2. Introduce centralized `problem.type` mapping with presentation policy.
3. Build reusable inline and toast error components including request-id copy controls.
4. Wire global QueryClient error handling for toast dispatch.
5. Migrate transactions, budgets, and analytics screens to shared error components/utilities.
6. Add tests for parser, mapping, and component copy interactions.
7. Run frontend quality gates (`npm run test`, `npm run test:coverage`, `npm run build`).

## Open Questions

- Should unsupported/unknown `problem.type` values be telemetry-tagged for mapping backlog creation?
- Should retry-after rendering use only header value or allow mapped detail fallback when header is absent?
- Do we want language-ready message keys now, or plain strings until i18n is planned?
