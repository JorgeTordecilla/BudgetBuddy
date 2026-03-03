## 1. Shared mobile overflow hardening

- [x] 1.1 Update shared form field styles to constrain intrinsic-width controls (`min-w-0`, `max-w-full`) including date input behavior.
- [x] 1.2 Ensure modal content containers prevent horizontal overflow while preserving vertical scroll behavior.

## 2. Route-level mobile-first interaction updates

- [x] 2.1 Refactor Transactions mobile header/filter layout so controls stay within viewport and create action remains discoverable without crowding.
- [x] 2.2 Refactor Analytics date/filter control layout for narrow viewports with touch-first apply interactions and no field overflow.
- [x] 2.3 Update AppShell mobile spacing for fixed bottom navigation + FAB safe-area coexistence so bottom content is never obscured.

## 3. Verification and regression safety

- [x] 3.1 Update and run frontend unit/integration tests covering changed components (`TransactionsPage`, `AnalyticsPage`, `AppShell`, modal/form shared components, CSS assertions).
- [x] 3.2 Run frontend verification commands: `npm run test`, `npm run test:coverage`, and `npm run build` from `frontend/`.
- [x] 3.3 Perform mobile smoke validation (small viewport) to confirm no horizontal overflow and no bottom-action occlusion on Transactions and Analytics.
