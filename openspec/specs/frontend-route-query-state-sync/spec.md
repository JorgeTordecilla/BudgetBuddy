## Purpose

Define deterministic synchronization rules between URL query parameters and frontend view state for filter/range-driven pages.
## Requirements
### Requirement: URL query params and view state MUST remain synchronized
Frontend pages with filter or range controls SHALL keep URL search params and in-memory UI state synchronized after initial load and during navigation.

#### Scenario: State initializes from valid URL query
- **WHEN** user lands on a supported page with valid query params
- **THEN** frontend SHALL initialize local state from URL values
- **AND** first data fetch SHALL use those values.

#### Scenario: URL change after mount updates page state
- **WHEN** URL search params change via back-forward navigation or in-app links
- **THEN** frontend SHALL resynchronize local state to the new URL
- **AND** subsequent fetches SHALL use synchronized values.

#### Scenario: User apply action updates URL deterministically
- **WHEN** user applies filters or range controls
- **THEN** frontend SHALL update URL search params using normalized query encoding
- **AND** page reload or shareable link SHALL reproduce the same view.

### Requirement: Invalid query params MUST degrade safely
Frontend SHALL validate and normalize URL parameters before using them in requests.

#### Scenario: Invalid params fallback to safe defaults
- **WHEN** query params are invalid, unsupported, or incomplete
- **THEN** frontend SHALL fallback to known safe default state
- **AND** SHALL avoid issuing invalid API requests.

#### Scenario: Partial params preserve valid subset
- **WHEN** only a subset of query params is valid
- **THEN** frontend SHALL keep valid parameters
- **AND** SHALL fill missing or invalid parameters with deterministic defaults.
