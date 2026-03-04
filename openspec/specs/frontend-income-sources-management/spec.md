## Purpose
Define the frontend contract for authenticated income source management, including list/create/update/archive/restore behavior and contract-safe money input handling.

## Requirements

### Requirement: Income sources frontend flow is authenticated and contract-safe
The frontend MUST provide an authenticated income sources management experience with list/create/update/archive flows aligned to API contract behavior.

#### Scenario: Income sources page renders and lists user sources
- **WHEN** an authenticated user navigates to `/app/income-sources`
- **THEN** frontend SHALL request `GET /income-sources` with vendor `Accept` header
- **AND** SHALL render active sources with deterministic loading/empty/error states.

#### Scenario: Create and update use major-unit money input with cents payload
- **WHEN** user creates or edits an income source expected amount
- **THEN** frontend SHALL accept major-unit currency input in the form
- **AND** SHALL convert to integer `expected_amount_cents` before `POST` or `PATCH`.

#### Scenario: Archive and restore respect contract behavior
- **WHEN** user archives or restores income sources
- **THEN** frontend SHALL call contract endpoints (`DELETE` archive, `PATCH` restore semantics where applicable)
- **AND** list state SHALL refresh deterministically after success.

#### Scenario: Income source errors map to deterministic feedback
- **WHEN** income source requests return canonical ProblemDetails statuses (`400`, `401`, `403`, `406`, `409`)
- **THEN** frontend SHALL parse and display deterministic user-facing feedback without losing form state.
