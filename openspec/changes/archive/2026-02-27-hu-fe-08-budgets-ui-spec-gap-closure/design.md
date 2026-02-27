## Context

`BudgetsPage` already supports list/create/update/archive, but several behaviors are not fully aligned with HU-FE-08 and current frontend governance:
- Range filtering applies on each input change instead of explicit apply.
- Query key shape is not normalized to list/detail semantics.
- `GET /budgets/{budget_id}` is missing from the API module.
- Table/form/query concerns are coupled in a single page component.
- Budget-specific `400` ProblemDetails are not mapped to field-level UX.

The backend contract already exists and must remain unchanged:
- Success: `application/vnd.budgetbuddy.v1+json`
- Errors: `application/problem+json`

## Goals / Non-Goals

**Goals:**
- Align budgets frontend behavior to HU-FE-08 requirement intent without changing backend APIs.
- Normalize budgets data-access boundaries (`api`, `queries`, `page/components`) for maintainability.
- Enforce deterministic validation/error UX for month and limit fields using canonical ProblemDetails types.
- Preserve contract-first transport behavior and auth/session semantics.
- Add/adjust tests for newly enforced UX and contract mappings.

**Non-Goals:**
- Backend endpoint/schema changes.
- New product features outside budgets management (analytics redesign, category domain changes).
- Replacing the shared API client transport/auth strategy.

## Decisions

1. Explicit apply model for month range
- Decision: introduce draft range state and applied range state in budgets page, fetching only on `Apply`.
- Rationale: avoids unstable fetch churn during field edits and matches HU behavior.
- Alternative considered: keep fetch-on-change; rejected because it makes invalid intermediate input states noisier and less deterministic.

2. Budgets query boundary and key normalization
- Decision: create `src/features/budgets/budgetsQueries.ts` with query keys:
  - `["budgets", "list", { from, to }]`
  - `["budgets", "detail", budgetId]`
  and centralize invalidations there (including analytics invalidations).
- Rationale: consistent cache boundaries and easier long-term maintenance.
- Alternative considered: inline queries in page; rejected due to weaker reuse and harder policy enforcement.

3. Complete budgets API surface
- Decision: add `getBudget(id)` to `src/api/budgets.ts`, retaining existing wrappers and contract parsing.
- Rationale: closes endpoint coverage gap and enables detail-key flow support.
- Alternative considered: postpone detail endpoint usage; rejected because HU-FE-08 requires endpoint parity in the FE module.

4. Component decomposition
- Decision: split page concerns into:
  - `BudgetsPage` (state orchestration)
  - `components/BudgetsTable`
  - `components/BudgetFormModal`
- Rationale: improves readability, testability, and policy compliance while preserving existing UI semantics.
- Alternative considered: keep single file; rejected because policy asks for clearer architecture boundaries.

5. Canonical budget error taxonomy mapping
- Decision: extend budget error mapping with explicit typed handling for:
  - `budget-month-invalid` (400)
  - `money-amount-*` (400 family for amount issues)
  - existing `budget-duplicate` / `category-archived` / `category-not-owned` (409)
  and expose field-targeted form feedback where applicable.
- Rationale: aligns UX with contract intent and reduces generic error noise.
- Alternative considered: generic banner-only handling; rejected because it does not satisfy HU field-level behavior.

6. Sorting and display consistency
- Decision: apply deterministic client-side sort for rendered budgets:
  - month descending
  - category label ascending as tie-breaker.
- Rationale: stable and predictable UI independent of backend incidental ordering.
- Alternative considered: trust backend ordering; rejected because this ordering rule is explicit in HU-FE-08 scope.

7. Accessibility and responsive behavior
- Decision: maintain semantic table for desktop and preserve horizontal overflow behavior; keep labeled controls and modal fields with clear aria labels.
- Rationale: consistent with current app shell patterns and accessibility baseline.
- Alternative considered: card-only mobile layout in this change; rejected as a larger UX shift not required for this gap-closure scope.

## Risks / Trade-offs

- [Risk] Refactor into smaller components may introduce regressions in modal state transitions. -> Mitigation: preserve current behavior with focused component tests (create/edit/archive flows).
- [Risk] Additional typed ProblemDetails mapping may diverge from backend type strings if naming changes. -> Mitigation: centralize constants in one mapping module and validate with integration-style tests.
- [Risk] Applying client-side sorting may differ from expected backend chronology for edge cases. -> Mitigation: explicitly document sort rule in spec and test for deterministic ordering.
- [Risk] Query key migration can leave stale caches if invalidation paths are incomplete. -> Mitigation: run explicit invalidation tests and keep legacy key invalidation during transition if needed.

## Migration Plan

1. Add/adjust budgets API wrappers (`getBudget`) and budgets query module with normalized keys.
2. Refactor Budgets UI into page + table + form modal components without behavior change first.
3. Introduce explicit range apply workflow and deterministic sorting.
4. Extend ProblemDetails mapping and inline field error rendering for budget-specific 400/409 cases.
5. Update/expand tests (helpers, component flows, problem-type mapping).
6. Run frontend gates: `npm run test`, `npm run test:coverage`, `npm run build`.
7. If regressions appear, rollback by reverting component split commit while retaining API/query improvements.

## Open Questions

- Should month/category remain editable in update by default, or should update focus only on `limit_cents` and expose advanced edits later?
- For `money-amount-*` types, do we want one generic field message or per-type copy in v1?
- Should archived budgets be optionally viewable in this screen in a follow-up HU, or remain excluded from active UX for now?
