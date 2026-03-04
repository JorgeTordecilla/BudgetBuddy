## Purpose
Define frontend bundle performance expectations for route-level code splitting and lazy-loaded feature pages.

## Requirements

### Requirement: Feature routes use lazy-loading with suspense fallbacks
The frontend MUST lazy-load feature pages so initial route payload excludes unrelated page code.

#### Scenario: Feature pages are lazy in router
- **WHEN** router configuration is reviewed
- **THEN** `TransactionsPage`, `TransactionsImportPage`, `BillsPage`, `SavingsPage`, `AnalyticsPage`, `AccountsPage`, and `CategoriesPage` are loaded via `React.lazy`.

#### Scenario: Every lazy route has suspense fallback
- **WHEN** a lazy feature route is rendered
- **THEN** route element is wrapped in `Suspense` with a visible fallback state.

### Requirement: Suspense fallback is design-system consistent
Lazy-loading transitions MUST show consistent loading UI and avoid blank flashes.

#### Scenario: Loading state is visible during chunk download
- **WHEN** a lazy chunk is pending
- **THEN** a skeleton/spinner from shared UI patterns is displayed.
- **AND** route content area does not appear empty without indicator.

### Requirement: Stable auth and shell routes remain eager
Authentication and shell primitives MUST remain statically loaded.

#### Scenario: Login and register remain non-lazy
- **WHEN** imports are reviewed
- **THEN** `Login` and `Register` remain static and do not require suspense wrappers.

#### Scenario: App shell remains non-lazy
- **WHEN** imports are reviewed
- **THEN** `AppShell` remains static so nav/chrome render before feature chunk resolution.

### Requirement: Build output uses manual vendor chunking
Vite build MUST apply manual chunking for major stable frontend dependencies.

#### Scenario: React ecosystem vendor chunk is separated
- **WHEN** `vite.config.ts` is reviewed
- **THEN** `build.rollupOptions.output.manualChunks` defines `vendor-react` with `react`, `react-dom`, and `react-router-dom`.

#### Scenario: React Query vendor chunk is separated
- **WHEN** `vite.config.ts` is reviewed
- **THEN** `build.rollupOptions.output.manualChunks` defines `vendor-query` with `@tanstack/react-query`.

#### Scenario: Heavy UI dependencies may be isolated
- **WHEN** build output indicates a UI/vendor cluster over practical threshold
- **THEN** an additional manual chunk group is defined for that heavy dependency set.

### Requirement: Route-level chunk load failures are contained and retryable
Chunk import failures for lazy pages MUST not tear down the entire app shell.

#### Scenario: Chunk load error renders local error state
- **WHEN** a lazy route chunk fails to download
- **THEN** user sees a route-level error state with retry action.
- **AND** AppShell navigation remains mounted and usable.

### Requirement: Quality gates remain green after splitting
Route-level code splitting MUST not degrade test/build quality gates.

#### Scenario: Frontend tests remain passing
- **WHEN** `npm run test` is executed after lazy-route changes
- **THEN** existing suites pass.

#### Scenario: Coverage remains compliant
- **WHEN** `npm run test:coverage` is executed
- **THEN** coverage thresholds remain satisfied.

#### Scenario: Build completes without unresolved split regressions
- **WHEN** `npm run build` is executed
- **THEN** build succeeds.
- **AND** chunk-size warning above 500 kB is absent, or explicitly resolved with adjusted chunking before acceptance.
