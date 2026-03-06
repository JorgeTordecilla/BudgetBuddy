# pwa-push-notifications Specification

## Purpose
TBD - created by syncing change pwa-push-notifications-bill-reminders. Update Purpose after archive.

## Requirements
### Requirement: Backend MUST support secure push subscription lifecycle
The API MUST expose VAPID public key retrieval and authenticated subscription management while keeping private-key material confidential.

#### Scenario: Public VAPID key is retrievable without authentication
- **WHEN** client calls `GET /api/push/vapid-public-key` without access token
- **THEN** API SHALL return `200` with `{ public_key }` using vendor media type.

#### Scenario: Private VAPID key is never exposed
- **WHEN** any push endpoint responds or logs operational events
- **THEN** `VAPID_PRIVATE_KEY` SHALL NOT appear in response payloads, headers, or log fields.

#### Scenario: Re-subscribe on same endpoint updates ownership and keys
- **WHEN** `POST /api/push/subscribe` receives an already-known endpoint
- **THEN** persisted record SHALL update `user_id`, `p256dh`, and `auth`
- **AND** duplicate endpoint rows SHALL NOT be created.

### Requirement: Reminder dispatch MUST target unpaid active bills due today and in three days
Daily reminder execution MUST compute due-date targets from bill domain fields and skip paid or inactive records.

#### Scenario: Today reminder is generated for unpaid active bill
- **WHEN** a bill is active, not archived, unpaid for current month, and computed due date equals today
- **THEN** dispatch SHALL send push payload with "due today" semantics.

#### Scenario: Three-day reminder is generated for unpaid active bill
- **WHEN** computed due date equals `today + 3 days`
- **THEN** dispatch SHALL send push payload with "due in 3 days" semantics.

#### Scenario: Paid, archived, or inactive bills are excluded
- **WHEN** bill has current-month payment OR `archived_at` set OR `is_active = false`
- **THEN** dispatcher SHALL NOT send reminder for that bill.

#### Scenario: Expired subscriptions are cleaned automatically
- **WHEN** push provider responds `410 Gone`
- **THEN** dispatcher SHALL remove the expired subscription record
- **AND** continue processing remaining subscriptions.

### Requirement: Service worker migration MUST preserve current cache contract while enabling push events
The frontend MUST migrate to injected custom service worker logic without regressing existing offline-readonly and update behavior.

#### Scenario: Runtime cache policy remains unchanged for API safety
- **WHEN** service worker handles API traffic
- **THEN** auth/session endpoints SHALL stay `NetworkOnly`
- **AND** other `/api/*` GET endpoints SHALL remain `NetworkFirst` with 5s timeout.

#### Scenario: SPA navigation fallback works offline
- **WHEN** user opens an app route while offline
- **THEN** service worker SHALL serve app shell fallback for non-API navigation requests.

#### Scenario: Update prompt activation still works
- **WHEN** frontend triggers update action from `useRegisterSW().updateServiceWorker(true)`
- **THEN** worker SHALL process `SKIP_WAITING` message and activate new worker on reload flow.

### Requirement: Notification interactions MUST route users into bills workflow
Push payload and click handling MUST provide deterministic deep-link behavior for bill reminder actions.

#### Scenario: Notification body click opens or focuses bills highlight URL
- **WHEN** user clicks notification body
- **THEN** app SHALL open/focus same-origin client and navigate to payload bill URL.

#### Scenario: mark_paid action includes payment intent
- **WHEN** user clicks `mark_paid` action
- **THEN** navigation target SHALL append `action=pay` to bill URL.

#### Scenario: dismiss action closes only
- **WHEN** user clicks `dismiss` action
- **THEN** notification SHALL close without opening or focusing app window.

### Requirement: Permission prompt UX MUST be delayed and respectful
Push permission request UI MUST avoid first-session disruption and support defer behavior.

#### Scenario: Prompt is hidden before session threshold
- **WHEN** local session counter is below 3
- **THEN** push permission banner SHALL NOT render.

#### Scenario: Prompt shows only for default permission state
- **WHEN** browser permission is `default` and defer window has elapsed
- **THEN** banner SHALL render activation and defer actions.

#### Scenario: Defer action suppresses banner for seven days
- **WHEN** user selects defer option
- **THEN** frontend SHALL store defer timestamp and suppress banner until defer window ends.

### Requirement: Non-production push test endpoint MUST be gated
Push test endpoint MUST not be broadly exposed in production or without shared secret in non-production.

#### Scenario: Push test is unavailable in production
- **WHEN** runtime environment is production
- **THEN** `POST /api/push/test` SHALL return not-found behavior.

#### Scenario: Push test in non-production requires header token
- **WHEN** request omits or mismatches `X-Push-Test-Token`
- **THEN** API SHALL reject request as unauthorized.
