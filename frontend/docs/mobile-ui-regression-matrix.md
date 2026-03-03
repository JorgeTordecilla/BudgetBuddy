# Mobile UI Regression Matrix

## Scope

- Goal: prevent mobile visual regressions in primary routes and modal workflows.
- Viewports: `390x844` (iPhone 13), `412x915` (Pixel 7), `768x1024` (tablet), `1280x800` (desktop sanity).
- Primary risk areas: horizontal overflow, fixed bottom nav/FAB overlap, modal field clipping, touch target usability.

## Global Acceptance Criteria

- [ ] No horizontal overflow (`documentElement.scrollWidth <= window.innerWidth`).
- [ ] No clipped content behind fixed bottom nav or floating actions.
- [ ] Date/month inputs and selects stay inside parent container width.
- [ ] Modal content scrolls vertically only (no horizontal scroll).
- [ ] Primary touch actions are clear and reachable on small screens.
- [ ] Keyboard focus remains visible on interactive controls.
- [ ] Loading, empty, and error states remain readable on mobile.

## Route Matrix

| Route | Breakpoint focus | Must pass |
|---|---|---|
| `/app/dashboard` | mobile + tablet | Month selector fits container; KPI cards readable; no bottom occlusion |
| `/app/transactions` | mobile + tablet + desktop | Filters do not overflow; FAB/create action visible; data list usable without horizontal dependency on mobile |
| `/app/analytics` | mobile + tablet | Date controls reflow cleanly; apply action tappable; cards/charts remain readable |
| `/app/budgets` | mobile + tablet + desktop | Month range controls fit width; table/card content readable; actions visible |
| `/app/accounts` | mobile + tablet + desktop | Header controls fit; card/table actions reachable; no modal-trigger crowding |
| `/app/categories` | mobile + tablet + desktop | Type filter and archived toggle reflow correctly; list actions remain tappable |
| `/app/transactions/import` | mobile + tablet + desktop | Textarea and action buttons fit width; result table remains contained with intentional x-scroll area |

## Modal Matrix

| Modal | Trigger path | Must pass |
|---|---|---|
| Create transaction | `/app/transactions` FAB/button | All fields stay within modal width; submit/cancel visible and tappable |
| Create budget | `/app/budgets` | Month/category/limit inputs fit; no horizontal scroll |
| Create account | `/app/accounts` | Form fields fit; footer actions visible with safe-area spacing |
| Create category | `/app/categories` | Form fields fit; footer actions visible with safe-area spacing |
| Archive account confirm | `/app/accounts` | Dialog content and actions fully visible; no overflow |
| Archive category confirm | `/app/categories` | Dialog content and actions fully visible; no overflow |

## Execution Checklist

- [ ] Run unit/integration checks: `npm run test -- --run src/pages/AccountsPage.test.tsx src/pages/CategoriesPage.test.tsx src/features/budgets/BudgetsPage.test.tsx src/features/dashboard/DashboardPage.test.tsx src/features/transactions/import/TransactionsImportPage.test.tsx src/components/components.test.tsx src/index.css.test.ts`.
- [ ] Run mobile overflow/occlusion E2E check: `E2E_BASE_URL=<url> E2E_USERNAME=<user> E2E_PASSWORD=<pass> PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers corepack pnpm exec playwright test tests/mobile-layout.spec.ts`.
- [ ] Run visual mobile pass with authenticated route traversal.
- [ ] Capture screenshots for every route and modal in matrix.
- [ ] Record overflow metrics per capture.
- [ ] If any failure appears, attach screenshot and file/line owner for fix.

## Latest Evidence

- Run date: `2026-03-02` (local QA run).
- Screenshot directory: `/tmp/mobile-qa-shots-2026-03-02`.
- Versioned overflow report: `frontend/docs/mobile-qa-evidence/overflow-report-2026-03-02.json`.
- Versioned archive-confirm report: `frontend/docs/mobile-qa-evidence/overflow-report-archive-modals-2026-03-02.json`.
- Outcome: all captured screens/modals reported `hasOverflow: false`.
