## Context

The frontend already has authenticated routing and session recovery (HU-FE-02), but it lacks operational pages for budget setup entities. Backend endpoints for accounts/categories are available with strict media-type and ProblemDetails behavior. This design focuses on a robust frontend implementation that consumes those endpoints without contract drift.

## Goals / Non-Goals

**Goals:**
- Deliver `/app/accounts` and `/app/categories` pages with CRUD/archive flows required by HU-FE-03.
- Keep API calls strictly aligned with contract headers and error semantics.
- Implement deterministic cursor pagination (`Load more`) and reset behavior when filters change.
- Provide clear UX for canonical errors (401 redirect, 403 forbidden banner, 406 contract error banner, 409 conflict feedback).
- Keep token handling consistent with HU-FE-02 (in-memory access token, refresh cookie via credentials include).

**Non-Goals:**
- Backend API changes or OpenAPI contract changes.
- New auth model beyond existing session provider and refresh flow.
- Advanced table features (sorting, server-side search beyond provided filters).
- End-to-end visual polish beyond functional and consistent component usage.

## Decisions

1. Data layer: Use React Query for list/mutation orchestration
- Rationale: Provides deterministic query invalidation for create/update/archive/restore flows and keeps page loading/error/mutation states explicit.
- Alternative considered: local state + manual fetch orchestration. Rejected due to duplicated refetch/error handling and more fragile pagination reset flows.

2. API module structure: thin endpoint wrappers in `src/api/accounts.ts` and `src/api/categories.ts`
- Rationale: Keeps UI components declarative and centralizes request params/typing.
- Alternative considered: inline calls per page. Rejected due to duplicated contract header and error parsing logic.

3. Error handling model: normalize and surface ProblemDetails at UI boundaries
- Rationale: Ensures canonical behavior for 401/403/406/409 and prevents silent failures.
- Alternative considered: generic toast on all errors. Rejected because it loses domain-relevant conflict messages and forbidden context.

4. Pagination behavior: append-only for same filter state, hard reset on filter/toggle changes
- Rationale: Matches backend cursor semantics and avoids duplicates/holes in mixed filter contexts.
- Alternative considered: infinite scroll. Deferred to keep deterministic behavior and simpler smoke verification.

5. Shared UI primitives: `PageHeader`, `ModalForm`, `ConfirmDialog`, `ProblemBanner`, optional toast
- Rationale: Keeps accounts/categories consistent and easier to extend for later HUs.
- Alternative considered: page-specific duplicated components. Rejected due to maintenance and inconsistent UX.

## Risks / Trade-offs

- [Risk] Cursor state bugs causing duplicate items on repeated load-more clicks -> Mitigation: maintain per-query cursor state and add unit tests for append/reset behavior.
- [Risk] Inconsistent ProblemDetails rendering across pages -> Mitigation: central error-to-UI mapping helper and shared banner/toast component.
- [Risk] Over-fetching after every mutation -> Mitigation: scoped query invalidation keys (`accounts`, `categories`) and optimistic UI avoided for correctness-first behavior.
- [Risk] Contract mismatch due to missing headers -> Mitigation: API wrapper tests assert `Accept` and `Content-Type` behavior.

## Migration Plan

- Add routes and shell navigation entries.
- Introduce API wrapper modules and shared UI components.
- Implement accounts page first, then categories page with restore behavior.
- Add unit tests and smoke verification checklist.
- Verify no regressions in existing auth-guarded navigation.

## Open Questions

- Should archived accounts show explicit archived badge in list rows, or only through filtered state?
- Should 409 conflicts render as toast only, or inline field-level messages when `detail` is parseable?
- Is Playwright available in current frontend toolchain now, or should initial verification remain manual + Vitest only?
