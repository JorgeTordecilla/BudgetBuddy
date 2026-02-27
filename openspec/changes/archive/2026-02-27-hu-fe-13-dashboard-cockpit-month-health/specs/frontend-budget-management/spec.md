## MODIFIED Requirements

### Requirement: Authenticated budgets route and range list must be available
The frontend SHALL expose a protected budgets page under the authenticated app shell and support month-range list retrieval.

#### Scenario: Budgets route accepts initial month from URL query
- **WHEN** user navigates to `/app/budgets?month=<YYYY-MM>`
- **THEN** frontend SHALL initialize both `from` and `to` range controls using that month when valid
- **AND** initial budgets request SHALL use the URL-provided month range.

#### Scenario: Invalid month query falls back safely
- **WHEN** `month` query param is absent or invalid
- **THEN** frontend SHALL fallback to existing current-month default behavior
- **AND** SHALL avoid issuing invalid month-range requests during initialization.
