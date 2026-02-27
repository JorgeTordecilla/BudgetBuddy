## MODIFIED Requirements

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

#### Scenario: Range filtering applies only on explicit user action
- **WHEN** the user edits `from` or `to` inputs without pressing apply
- **THEN** frontend SHALL keep the previous applied query range for list requests
- **AND** frontend SHALL fetch with the new range only after an explicit apply action.

#### Scenario: Budgets list is deterministically ordered
- **WHEN** budget items are rendered in the table
- **THEN** frontend SHALL sort items by month descending
- **AND** frontend SHALL use category label ascending as a stable tie-breaker.

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

#### Scenario: Budget detail endpoint is available in frontend API module
- **WHEN** frontend requires a single budget record by identifier
- **THEN** frontend SHALL provide a contract-safe wrapper for `GET /budgets/{budget_id}`
- **AND** wrapper behavior SHALL preserve vendor media type and ProblemDetails parsing rules.

### Requirement: Budget ProblemDetails handling must be deterministic
The frontend SHALL parse `application/problem+json` and provide canonical, contract-aware feedback.

#### Scenario: Canonical status handling
- **WHEN** budgets API returns `400`, `401`, `403`, `406`, `409`, or `429`
- **THEN** frontend SHALL parse ProblemDetails (`type`, `title`, `status`, optional `detail`)
- **AND** frontend SHALL present deterministic user-facing feedback for each status class.

#### Scenario: Conflict mappings are explicit
- **WHEN** API returns `409` with type `budget-duplicate`, `category-archived`, or `category-not-owned`
- **THEN** frontend SHALL display a specific conflict message mapped from ProblemDetails type.

#### Scenario: Invalid budget month maps to field-level feedback
- **WHEN** API returns `400` with type `budget-month-invalid`
- **THEN** frontend SHALL highlight the month input with inline validation context
- **AND** frontend SHALL keep a readable ProblemDetails message available to the user.

#### Scenario: Money amount validation errors map to limit field feedback
- **WHEN** API returns `400` with a `money-amount-*` ProblemDetails type
- **THEN** frontend SHALL highlight the limit input with deterministic inline guidance
- **AND** frontend SHALL avoid showing only generic banner-level validation text.

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
- **AND** backend-driven `400 budget-month-invalid` feedback SHALL be covered by tests
- **AND** `npm run test`, `npm run test:coverage`, and `npm run build` SHALL pass.

## ADDED Requirements

### Requirement: Budgets query architecture must expose list and detail cache boundaries
The frontend SHALL define explicit budgets query modules and stable query key semantics for list and detail operations.

#### Scenario: List query key uses normalized structure
- **WHEN** frontend fetches budgets by month range
- **THEN** React Query key SHALL be `["budgets", "list", { from, to }]`
- **AND** list mutations SHALL invalidate the corresponding list cache entries.

#### Scenario: Detail query key uses normalized structure
- **WHEN** frontend fetches a budget by id
- **THEN** React Query key SHALL be `["budgets", "detail", budgetId]`
- **AND** mutations affecting that budget SHALL invalidate the detail cache entry.

#### Scenario: Budgets mutations invalidate analytics caches
- **WHEN** create, update, or archive budget succeeds
- **THEN** frontend SHALL invalidate impacted analytics queries
- **AND** overlay-dependent analytics views SHALL refresh deterministically.

### Requirement: Budgets feature structure must separate page orchestration from reusable UI components
The budgets frontend SHALL keep orchestration, table rendering, and form interactions in explicit module boundaries.

#### Scenario: Table concerns are isolated
- **WHEN** budgets list is rendered
- **THEN** row rendering and actions SHALL live in a dedicated table component
- **AND** page container SHALL focus on data and flow orchestration.

#### Scenario: Form concerns are isolated
- **WHEN** create/edit budget modal is rendered
- **THEN** budget form inputs and submission controls SHALL live in a dedicated form component
- **AND** page container SHALL provide state, handlers, and error payload inputs.
