## Purpose

Define standardized frontend shared primitives around shadcn prebuilt components for dialogs, form controls, and tables while preserving existing domain contracts and responsive accessibility behavior.

## Requirements

### Requirement: Shared frontend primitives SHALL use shadcn prebuilt components
The frontend SHALL expose reusable UI primitives through `frontend/src/ui/*` using shadcn prebuilt components for dialogs, confirmation dialogs, form controls, and table structures.

#### Scenario: Dialog primitives are standardized
- **WHEN** a feature renders a modal or confirmation interaction
- **THEN** it SHALL use shared shadcn `Dialog` or `AlertDialog` primitives
- **AND** it SHALL NOT reintroduce ad-hoc overlay/focus container primitives.

#### Scenario: Table primitives are standardized
- **WHEN** transactional, analytical, or management views render tabular data
- **THEN** table markup SHALL be composed from shared shadcn `Table` primitives
- **AND** table semantics (`header`, `body`, `row`, `cell`) SHALL remain explicit and testable.

### Requirement: Form field migrations SHALL preserve domain contract behavior
Shadcn-backed form controls SHALL preserve the existing frontend domain contract for value formats, validation messaging, and submit payload shape.

#### Scenario: Existing payload shapes remain unchanged
- **WHEN** users submit forms after control migration to shadcn primitives
- **THEN** request payload keys and value formats SHALL remain identical to pre-migration behavior
- **AND** API media-type usage SHALL remain `application/vnd.budgetbuddy.v1+json` for success and `application/problem+json` for errors.

#### Scenario: Validation and ProblemDetails rendering remain stable
- **WHEN** local validation or backend ProblemDetails errors occur
- **THEN** field-level and inline error feedback SHALL remain visible with equivalent semantics
- **AND** support-code/request-id affordances SHALL remain available where previously supported.

### Requirement: Standardized components SHALL remain responsive and accessible
Shadcn migrations SHALL preserve responsive behavior and accessible labels/roles across mobile and desktop breakpoints.

#### Scenario: Mobile controls remain operable
- **WHEN** users interact with migrated form controls and dialogs on narrow viewports
- **THEN** controls and actions SHALL remain reachable without horizontal overflow
- **AND** keyboard/screen-reader metadata SHALL remain present for interactive elements.

#### Scenario: Route-level UX states remain complete
- **WHEN** migrated pages render loading, empty, success, and error states
- **THEN** each state SHALL remain visually and semantically distinct
- **AND** user recovery actions (retry, dismiss, confirm, cancel) SHALL remain available where currently required.

### Requirement: Auth route forms SHALL use shared shadcn input primitives
Login and Register pages SHALL use shared design-system primitives for text and selection controls instead of route-local native control implementations.

#### Scenario: Login fields use shared input primitives
- **WHEN** login route renders username and password fields
- **THEN** username SHALL use shared `Input` primitive
- **AND** password SHALL use reusable shared `PasswordInput` primitive.

#### Scenario: Register currency uses shared select primitive
- **WHEN** register route renders currency selection
- **THEN** route SHALL use shared shadcn `Select` composition (`SelectTrigger`, `SelectContent`, `SelectItem`)
- **AND** selected value behavior SHALL remain contract-compatible with existing submit payload.

### Requirement: Reusable PasswordInput SHALL provide deterministic toggle behavior
A shared password field component SHALL encapsulate show/hide behavior and preserve pass-through input props.

#### Scenario: Toggle switches input type and aria label
- **WHEN** user activates password toggle control
- **THEN** input type SHALL switch between `password` and `text`
- **AND** toggle control aria-label SHALL switch between `Show password` and `Hide password`.

#### Scenario: PasswordInput preserves input contract
- **WHEN** consumers pass `name`, `required`, `value`, `onChange`, `autoComplete`, or `autoFocus`
- **THEN** component SHALL pass those props to underlying shared `Input`
- **AND** password toggle SHALL not mutate payload semantics.

#### Scenario: Toggle tab-order decision remains explicit and documented
- **WHEN** PasswordInput renders toggle control with `tabIndex = -1`
- **THEN** implementation SHALL include inline documentation of this mobile-first accessibility tradeoff
- **AND** behavior SHALL remain deterministic for future accessibility-policy revision.
