## ADDED Requirements

### Requirement: Authenticated budgets route and range list must be available
The frontend SHALL expose a protected budgets page under the authenticated app shell and support month-range list retrieval.

#### Scenario: Route is available under app shell
- **WHEN** an authenticated user navigates to `/app/budgets`
- **THEN** the budgets page SHALL render within `AppShell`
- **AND** unauthenticated users SHALL follow existing auth guard behavior.

#### Scenario: List budgets by month range
- **WHEN** the page requests budgets for `from` and `to` in `YYYY-MM`
- **THEN** frontend SHALL call `GET /budgets?from=<YYYY-MM>&to=<YYYY-MM>`
- **AND** frontend SHALL render loading, empty, success, and error states explicitly.

### Requirement: Budget create and update flows must be contract-strict
The frontend SHALL support budget creation and partial updates using vendor media type and integer-cents payloads.

#### Scenario: Create budget submits valid payload
- **WHEN** user submits the create budget form with valid `month`, `category_id`, and limit input
- **THEN** frontend SHALL convert the entered amount into integer `limit_cents`
- **AND** frontend SHALL call `POST /budgets` with vendor `Content-Type` and `Accept`
- **AND** successful response SHALL refresh budgets list state.

#### Scenario: Update budget submits partial payload
- **WHEN** user edits an existing budget and saves changes
- **THEN** frontend SHALL call `PATCH /budgets/{budget_id}` with only changed fields
- **AND** successful response SHALL reflect updated values in the budgets list.

### Requirement: Budget archive lifecycle must be supported
The frontend SHALL support archive actions through the contract-defined delete endpoint.

#### Scenario: Archive budget from list
- **WHEN** user confirms archive action for a budget row
- **THEN** frontend SHALL call `DELETE /budgets/{budget_id}`
- **AND** on `204` the archived budget SHALL no longer appear in the active list view.

### Requirement: Budget categories selection must include active income and expense categories
The frontend SHALL populate budget category selection from active categories without frontend-only type restrictions.

#### Scenario: Category selector loads active categories
- **WHEN** budget create/edit modal opens
- **THEN** frontend SHALL call `GET /categories?include_archived=false`
- **AND** selector SHALL include both `income` and `expense` categories that are active.

### Requirement: Budget ProblemDetails handling must be deterministic
The frontend SHALL parse `application/problem+json` and provide canonical, contract-aware feedback.

#### Scenario: Canonical status handling
- **WHEN** budgets API returns `400`, `401`, `403`, `406`, `409`, or `429`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** frontend SHALL present deterministic user-facing feedback for each status class.

#### Scenario: Conflict mappings are explicit
- **WHEN** API returns `409` with type `budget-duplicate`, `category-archived`, or `category-not-owned`
- **THEN** frontend SHALL display a specific conflict message mapped from ProblemDetails type.

### Requirement: Budgets feature must preserve frontend contract and quality gates
The budgets UI SHALL align with existing frontend auth/session and verification standards.

#### Scenario: API-client behavior remains contract-first
- **WHEN** frontend performs budgets requests
- **THEN** requests SHALL include vendor `Accept` header
- **AND** `POST`/`PATCH` requests SHALL include vendor `Content-Type`
- **AND** authenticated requests SHALL use bearer access token with existing refresh behavior and `credentials: include` transport.

#### Scenario: Validation and verification gates pass
- **WHEN** budgets implementation is verified
- **THEN** month validation (`YYYY-MM`, `from <= to`) and amount-to-cents conversion SHALL be covered by tests
- **AND** conflict feedback for `409 budget-duplicate` SHALL be covered by tests
- **AND** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass.
