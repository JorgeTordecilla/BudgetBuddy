## Context

The frontend already uses:
- React Router protected routes under `/app/*`
- TanStack Query for server-state
- Contract-aware API client with:
  - `Accept: application/vnd.budgetbuddy.v1+json`
  - conditional vendor `Content-Type`
  - `credentials: include`
  - bearer token + refresh-on-401 behavior

Accounts and categories pages already follow this model. Transactions should align to the same architecture and UX patterns.

## Goals / Non-Goals

**Goals**
- Add a complete transaction management flow in `/app/transactions`.
- Keep API behavior strictly aligned with backend contract and media types.
- Keep deterministic handling for canonical ProblemDetails statuses.
- Support soft-delete lifecycle with restore via patch.

**Non-Goals**
- Export/import bulk flows (covered by separate HUs).
- New backend endpoints or schema changes.
- Analytics redesign beyond cache invalidation hooks.

## Decisions

1. Route and shell integration
- Decision: use `/app/transactions` route under existing `RequireAuth` and `AppShell`.
- Rationale: consistency with existing private route topology.

2. API module boundaries
- Decision: add `src/api/transactions.ts` with thin wrappers (`list/create/patch/archive/restore`).
- Rationale: mirrors `accounts.ts` and `categories.ts`, avoids contract logic duplication in UI.

3. Error mapping strategy
- Decision: centralize ProblemDetails message mapping in a small helper module used by transaction UI.
- Rationale: avoids per-component ad-hoc interpretation and guarantees deterministic UX.

4. List state and pagination
- Decision: use cursor pagination with append semantics and dedupe by `id` where needed.
- Rationale: keeps behavior consistent with current list pages and avoids duplicate rows.

5. Restore semantics
- Decision: restore is `PATCH /transactions/{id}` with `{ "archived_at": null }`.
- Rationale: explicit contract alignment with soft-delete model.

## Data Flow

```text
TransactionsPage
  -> useQuery(list transactions)
  -> useMutation(create transaction)
  -> useMutation(patch transaction)
  -> useMutation(archive transaction)
  -> useMutation(restore transaction)
        |
        v
   api/transactions.ts
        |
        v
   api/client.ts (headers/auth/refresh/problem parsing)
```

## Error Semantics

Mandatory handling in transactions UI:
- `400`: invalid request feedback banner/toast
- `401`: rely on global auth refresh + redirect behavior
- `403`: forbidden banner
- `406`: client contract error banner
- `409`: conflict feedback with specific mapping for `category-type-mismatch`

## Risks / Trade-offs

- [Risk] Divergent transaction UX vs accounts/categories
  - Mitigation: reuse shared components (`PageHeader`, `ModalForm`, `ConfirmDialog`, `ProblemBanner`).
- [Risk] Over-fetching from frequent invalidation
  - Mitigation: scoped query keys and targeted invalidation.
- [Risk] Contract mismatch around optional fields/nullability
  - Mitigation: strict frontend payload typing and wrapper tests.

## Verification Strategy

- Unit tests:
  - ProblemDetails type/status -> user message mapping
  - API wrappers and payload shape for patch/restore/archive
- Component/integration tests:
  - Archive flow removes item (or updates view based on include_archived)
  - Restore flow transitions archived item to active
  - Patch flow updates rendered row values
- Quality gates:
  - `npm run test`
  - `npm run test:coverage`
  - `npm run build`
