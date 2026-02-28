## Purpose

Define frontend contract and behavior for authenticated setup management across accounts/categories and budget setup/edit ergonomics.

## Requirements

### Requirement: Authenticated navigation exposes setup management screens
The frontend MUST expose authenticated routes for accounts and categories management and include navigation links from the authenticated shell.

#### Scenario: Authenticated user can access setup routes from shell navigation
- **WHEN** an authenticated user opens the app shell
- **THEN** navigation SHALL include links to `/app/accounts` and `/app/categories`
- **AND** route transitions SHALL render the corresponding management pages

### Requirement: Accounts management screen consumes contract-strict API behavior
The accounts screen MUST implement list/create/edit/archive flows using the strict API media types and authorization semantics.

#### Scenario: Accounts list supports archived toggle and cursor pagination
- **WHEN** user opens `/app/accounts` with default filters
- **THEN** frontend SHALL request `GET /accounts?include_archived=false` with vendor `Accept` header
- **AND** if `next_cursor` is present, frontend SHALL offer a load-more action that appends items without replacing previous page data

#### Scenario: Accounts create and edit operations return deterministic UI updates
- **WHEN** user submits valid create or edit account forms
- **THEN** frontend SHALL call `POST /accounts` or `PATCH /accounts/{account_id}` with vendor content type
- **AND** successful responses SHALL refresh or invalidate account list state to show updated data

#### Scenario: Accounts archive operation removes active visibility by default
- **WHEN** user confirms archive action for an account
- **THEN** frontend SHALL call `DELETE /accounts/{account_id}`
- **AND** archived account SHALL be hidden in default list mode and visible when archived toggle is enabled

### Requirement: Categories management screen supports archive and restore lifecycle
The categories screen MUST implement list/create/edit/archive/restore behavior with category-type filtering and archived visibility control.

#### Scenario: Categories list supports type filter, archived toggle, and cursor pagination
- **WHEN** user changes `type` or `include_archived` filters
- **THEN** frontend SHALL reset pagination state and fetch `GET /categories` with updated query parameters
- **AND** subsequent load-more actions SHALL append results for the same filter state only

#### Scenario: Categories archive and restore actions are contract-aligned
- **WHEN** user archives an active category
- **THEN** frontend SHALL call `DELETE /categories/{category_id}` and reflect archived state on refresh
- **AND WHEN** user restores an archived category
- **THEN** frontend SHALL call `PATCH /categories/{category_id}` with `{ "archived_at": null }` and reflect active state on refresh

### Requirement: Frontend ProblemDetails handling is canonical and user-visible
The pages MUST parse and display canonical ProblemDetails responses without swallowing error context.

#### Scenario: Auth and permission failures follow deterministic UX policy
- **WHEN** API responses return `401`, `403`, or `406`
- **THEN** frontend SHALL redirect to `/login` on `401`
- **AND** SHALL show a forbidden banner on `403`
- **AND** SHALL show a client-contract error banner on `406`

#### Scenario: Conflict responses preserve domain validation details
- **WHEN** API responses return `409` with ProblemDetails
- **THEN** frontend SHALL show at least `title` and `detail` (if present) in inline or toast feedback
- **AND** SHALL avoid automatic retry loops for conflict responses

### Requirement: Frontend API calls preserve secure session transport rules
Accounts and categories API calls MUST preserve existing FE session constraints.

#### Scenario: Requests include credentials and do not persist access token in storage
- **WHEN** frontend performs accounts/categories API requests
- **THEN** requests SHALL use `credentials: include`
- **AND** access tokens SHALL remain in memory-only auth state with no localStorage/sessionStorage persistence

### Requirement: Budget setup forms mobile ergonomics
Budget setup and edit forms SHALL be optimized for mobile input ergonomics, including field spacing, touch targets, and error readability.

#### Scenario: Budget form completion on small viewport
- **WHEN** a user creates or edits a budget on a small viewport
- **THEN** required fields, validation messages, and submit actions remain visible and usable without accidental overlap or clipped controls
