## 1. Routing and shell navigation

- [x] 1.1 Add authenticated routes for `/app/accounts` and `/app/categories`.
- [x] 1.2 Add AppShell navigation links for Accounts and Categories.
- [x] 1.3 Ensure route guards preserve HU-FE-02 behavior (unauthenticated users redirected to `/login`).

## 2. API wrappers and contract handling

- [x] 2.1 Add `src/api/accounts.ts` wrappers for list/create/update/archive with typed request params.
- [x] 2.2 Add `src/api/categories.ts` wrappers for list/create/update/archive/restore with typed request params.
- [x] 2.3 Ensure wrappers send vendor media-type headers, bearer auth, and `credentials: include` through shared client.
- [x] 2.4 Normalize ProblemDetails parsing so UI can consume canonical `{ type, title, status, detail? }`.

## 3. Accounts page UI and behavior

- [x] 3.1 Implement `AccountsPage` list view with loading/error/empty states and archived toggle.
- [x] 3.2 Implement create/edit account modal forms with required field validation.
- [x] 3.3 Implement archive confirm flow calling delete endpoint and refreshing list state.
- [x] 3.4 Implement load-more behavior using `next_cursor` append semantics.

## 4. Categories page UI and behavior

- [x] 4.1 Implement `CategoriesPage` list view with type filter, archived toggle, and loading/error/empty states.
- [x] 4.2 Implement create/edit category modal forms.
- [x] 4.3 Implement archive action and restore action (`PATCH { archived_at: null }`) with refresh.
- [x] 4.4 Implement load-more behavior with cursor append and reset on filter changes.

## 5. Shared components and UX consistency

- [x] 5.1 Add reusable `PageHeader` and `ModalForm` composition for accounts/categories screens.
- [x] 5.2 Add `ConfirmDialog` for archive actions.
- [x] 5.3 Add `ProblemBanner` (and/or toast adapter) for canonical 403/406/409 display behavior.

## 6. Tests and verification

- [x] 6.1 Add Vitest unit tests for accounts/categories API wrappers (headers + ProblemDetails handling).
- [x] 6.2 Add unit tests for pagination append/reset behavior.
- [x] 6.3 Add smoke verification steps (manual or Playwright) for login -> accounts/category CRUD/archive/restore flows.
- [x] 6.4 Run frontend tests and ensure coverage gate meets project threshold (>= 90% if configured for frontend).
