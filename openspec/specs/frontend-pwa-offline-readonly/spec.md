# frontend-pwa-offline-readonly Specification

## Purpose
TBD - created by syncing change frontend-pwa-installable-offline-readonly. Update Purpose after archive.
## Requirements
### Requirement: Frontend MUST be installable as a standards-compliant PWA
The frontend SHALL provide manifest metadata, icon assets, and service-worker registration needed for installability on supported Android and iOS browsers.

#### Scenario: Manifest is generated at default plugin path
- **WHEN** production build artifacts are inspected
- **THEN** the manifest SHALL be available at `/manifest.webmanifest`
- **AND** the project SHALL NOT require a custom `manifestFilename` override.

#### Scenario: Manifest includes separated 512 icon purposes
- **WHEN** manifest content is validated
- **THEN** it SHALL include a `512x512` icon for general launcher usage with `purpose: "any"` (or no purpose field)
- **AND** it SHALL include a dedicated `512x512` icon with `purpose: "maskable"` pointing to `pwa-maskable-512x512.png`
- **AND** it SHALL NOT rely on a single icon entry with `purpose: "any maskable"`.

#### Scenario: Manifest includes installability metadata
- **WHEN** manifest content is validated
- **THEN** it SHALL include `name`, `short_name`, `display: standalone`, `start_url`, icons (192 + 512 any + 512 maskable), and shortcuts.

#### Scenario: iOS metadata is present
- **WHEN** `index.html` is inspected
- **THEN** Apple standalone meta tags and `apple-touch-icon` link SHALL be present.

### Requirement: Service worker runtime caching MUST protect auth/session correctness
Runtime caching SHALL use ordered route rules that exclude auth/session-sensitive endpoints from cache and provide offline fallback only for non-sensitive GET APIs.

#### Scenario: Auth/session endpoints bypass cache
- **WHEN** GET requests target `/api/auth/*`, `/api/me`, `/api/token`, or `/api/refresh`
- **THEN** service worker strategy SHALL be `NetworkOnly`
- **AND** responses SHALL NOT be read from or written to runtime cache.

#### Scenario: Other API GET requests use network-first fallback
- **WHEN** GET requests target other `/api/*` routes
- **THEN** service worker strategy SHALL be `NetworkFirst` with `networkTimeoutSeconds = 5`
- **AND** cached response SHALL be used if network does not answer within timeout.

### Requirement: Offline read-only UX MUST be explicit and non-blocking
The app SHALL surface connectivity state and remain usable while rendering cached data.

#### Scenario: Offline banner toggles by browser connectivity events
- **WHEN** browser transitions to offline
- **THEN** app SHALL render an informational top banner indicating cached-data mode.
- **AND** the banner SHALL disappear automatically when browser returns online.

#### Scenario: Offline banner does not block navigation
- **WHEN** offline banner is visible
- **THEN** route navigation, scroll, and interactive controls SHALL remain usable.

### Requirement: Offline non-GET mutations MUST be blocked centrally
Non-GET API writes SHALL be rejected before fetch execution while offline using centralized API-client logic.

#### Scenario: Offline mutation fails deterministically before network call
- **WHEN** browser is offline and a request method is not `GET`
- **THEN** `src/api/client.ts` SHALL reject request with explicit offline mutation error type
- **AND** no transport request SHALL be sent.

#### Scenario: Offline mutation feedback is user-visible
- **WHEN** an offline mutation error is raised
- **THEN** UI SHALL show deterministic feedback equivalent to "No connection, try again when online"
- **AND** generic unknown-error messaging SHALL be avoided for this case.

### Requirement: App update activation MUST be user-controlled
Service-worker upgrades SHALL not interrupt active sessions without user confirmation.

#### Scenario: Update prompt appears when new worker is waiting
- **WHEN** a new service worker version is available
- **THEN** app SHALL show a non-blocking update prompt with explicit refresh action.

#### Scenario: Upgrade occurs only after explicit action
- **WHEN** user triggers update action
- **THEN** app SHALL activate waiting service worker and reload into new version.

### Requirement: App badge MUST reflect current calendar month bill workload
Badge count SHALL be computed from current system month, independent of bills screen navigation context.

#### Scenario: Badge uses current system month source
- **WHEN** app computes monthly bill badge count
- **THEN** query month SHALL be derived from `new Date()` (calendar current month)
- **AND** it SHALL NOT depend on UI-selected month filter state.

#### Scenario: Badge count equals pending plus overdue
- **WHEN** monthly status is available
- **THEN** app badge value SHALL equal `pending_count + overdue_count`
- **AND** badge SHALL clear when count is zero or when app shell mounts.

### Requirement: PWA integration MUST satisfy frontend quality gates
PWA integration SHALL compile and test cleanly with install-prompt behavior covered by unit tests.

#### Scenario: Build succeeds with updated manifest assets
- **WHEN** frontend production build is executed
- **THEN** build SHALL succeed with the updated manifest icon entries and maskable asset reference.

#### Scenario: Install prompt hook behavior is validated
- **WHEN** frontend tests run in jsdom
- **THEN** `useInstallPrompt` tests SHALL cover deferred event capture, prompt result mapping, and standalone suppression (`canInstall = false`).

#### Scenario: Install prompt UI behavior is validated
- **WHEN** frontend tests run
- **THEN** `InstallPrompt` tests SHALL cover hidden state when unavailable, dismiss behavior for current session, and install-click prompt invocation.

### Requirement: Install prompt UX MUST be deterministic and non-intrusive
The app SHALL expose a contextual install banner backed by a single install lifecycle hook, and SHALL never show install CTA while already running in standalone mode.

#### Scenario: App shell places install/fallback prompt below header
- **WHEN** AppShell renders on mobile or iOS Safari fallback flow
- **THEN** install/fallback guidance SHALL appear below the BB header/title block
- **AND** it SHALL NOT render above the shell header container.

