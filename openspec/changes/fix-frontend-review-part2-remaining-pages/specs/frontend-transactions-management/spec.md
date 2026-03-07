## MODIFIED Requirements

### Requirement: Authenticated transactions route and list must be available
The frontend SHALL expose a protected transactions experience under the private app shell, including import and export entry points, and SHALL keep transaction filters synchronized with URL state.

#### Scenario: `action=new` deep link opens create modal deterministically
- **WHEN** user navigates to `/app/transactions?action=new`
- **THEN** frontend SHALL open the create transaction modal exactly once for that navigation state
- **AND** frontend SHALL remove the `action` query param via replace navigation after opening
- **AND** route effect behavior SHALL remain dependency-complete to avoid stale callback usage.

### Requirement: Transactions page must reuse global frontend quality standards
The transactions experience SHALL follow the established frontend policy for state handling, accessibility, responsiveness, and verification.

#### Scenario: Option-list queries follow resource-oriented cache keys
- **WHEN** transactions page requests account, category, and income-source options
- **THEN** query keys SHALL use normalized resource-oriented key families aligned with cross-page conventions
- **AND** keys SHALL include relevant option params to preserve deterministic cache boundaries.
