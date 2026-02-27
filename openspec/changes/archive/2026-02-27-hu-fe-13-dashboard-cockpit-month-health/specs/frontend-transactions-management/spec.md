## MODIFIED Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions experience under the private app shell, including import and export entry points.

#### Scenario: Transactions route accepts initial filters from URL query
- **WHEN** user navigates to `/app/transactions` with valid query params (`from`, `to`, `type`, optional `account_id`, optional `category_id`)
- **THEN** frontend SHALL initialize filters from URL values
- **AND** initial transactions list request SHALL use the URL-provided filters.

#### Scenario: Invalid query filters fall back safely
- **WHEN** URL query params are invalid or unsupported
- **THEN** frontend SHALL fallback to existing default filter values
- **AND** SHALL avoid emitting invalid list requests from initialization.
