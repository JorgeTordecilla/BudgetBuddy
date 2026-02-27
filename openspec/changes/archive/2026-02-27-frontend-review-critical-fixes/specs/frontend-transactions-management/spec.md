## MODIFIED Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions experience under the private app shell, including import and export entry points, and SHALL keep transaction filters synchronized with URL state.

#### Scenario: Route is available under app shell
- **WHEN** an authenticated user navigates to `/app/transactions`
- **THEN** the transactions page SHALL render within `AppShell`
- **AND** unauthenticated access SHALL follow existing auth guard behavior.

#### Scenario: Import route is available under app shell
- **WHEN** an authenticated user navigates to `/app/transactions/import`
- **THEN** the import page SHALL render within `AppShell`
- **AND** unauthenticated access SHALL follow existing auth guard behavior.

#### Scenario: Export action is available within transactions workflow
- **WHEN** an authenticated user opens `/app/transactions`
- **THEN** the transactions UI SHALL provide an `Export CSV` action within the transactions action menu
- **AND** unauthenticated access SHALL continue to follow existing auth guard behavior.

#### Scenario: Transactions list uses contract headers and supports cursor pagination
- **WHEN** the transactions page fetches list data
- **THEN** it SHALL call `GET /transactions` with vendor `Accept` header and auth context
- **AND** it SHALL support cursor-based pagination using `next_cursor`.

#### Scenario: Transactions route accepts initial filters from URL query
- **WHEN** user navigates to `/app/transactions` with valid query params (`from`, `to`, `type`, optional `account_id`, optional `category_id`)
- **THEN** frontend SHALL initialize filters from URL values
- **AND** initial transactions list request SHALL use the URL-provided filters.

#### Scenario: URL changes after mount resync filters
- **WHEN** search params change after first render through navigation or browser history
- **THEN** frontend SHALL resynchronize filter state from URL values
- **AND** list query SHALL refetch using synchronized filters.

#### Scenario: Applying filters writes normalized URL params
- **WHEN** user changes filters in the transactions screen
- **THEN** frontend SHALL update URL query params with normalized keys and values
- **AND** shared or reloaded URL SHALL reproduce the same filter state.

#### Scenario: Invalid query filters fall back safely
- **WHEN** URL query params are invalid or unsupported
- **THEN** frontend SHALL fallback to existing default filter values
- **AND** SHALL avoid emitting invalid list requests from initialization.

