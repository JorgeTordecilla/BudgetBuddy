# frontend-routing-ui-foundation Specification

## Purpose
TBD - created by archiving change hu-fe-01-frontend-skeleton-routing-ui-system. Update Purpose after archive.
## Requirements
### Requirement: Frontend workspace bootstrap is standardized
The system MUST provide a frontend project scaffold in `frontend/` using Vite + React + TypeScript with strict-mode-compatible defaults.

#### Scenario: Frontend workspace is available in monorepo
- **WHEN** developers inspect the monorepo after applying this change
- **THEN** `frontend/` SHALL contain a runnable Vite React TypeScript project skeleton

### Requirement: Public and private routes are explicitly separated
Frontend routing MUST define public and private route boundaries with deterministic redirect behavior.

#### Scenario: Public login route is reachable
- **WHEN** a user navigates to `/login`
- **THEN** the application SHALL render the login screen

#### Scenario: Root route redirects to dashboard path
- **WHEN** a user navigates to `/`
- **THEN** the router SHALL redirect to `/app/dashboard`

#### Scenario: Private route tree is guarded
- **WHEN** a user navigates to `/app` or `/app/dashboard`
- **THEN** the route SHALL be resolved through `RequireAuth`

#### Scenario: Public register route is reachable
- **WHEN** a user navigates to `/register`
- **THEN** the application SHALL render the registration screen

#### Scenario: Login and register screens provide reciprocal navigation
- **WHEN** a user is on `/login`
- **THEN** the UI SHALL expose navigation to `/register`
- **AND** `/register` SHALL expose navigation back to `/login`

### Requirement: Temporary auth guard blocks private routes
Until HU-FE-02 is implemented, the auth guard MUST always treat users as unauthenticated.

#### Scenario: Guard always redirects to login in FE-01 baseline
- **WHEN** `RequireAuth` evaluates a private route in HU-FE-01
- **THEN** it SHALL use `authed = false`
- **AND** it SHALL redirect to `/login`

#### Scenario: Guard uses session-aware bootstrap in FE-02
- **WHEN** HU-FE-02 is implemented
- **THEN** `RequireAuth` SHALL evaluate auth from in-memory session state
- **AND** it SHALL attempt refresh bootstrap before redirecting unauthenticated users
- **AND** it SHALL allow private routes when refresh/bootstrap succeeds

### Requirement: UI system baseline is verified in login route
The frontend MUST initialize Tailwind and shadcn/ui and render baseline components on `/login`.

#### Scenario: Login page uses shadcn primitives
- **WHEN** a user opens `/login`
- **THEN** the page SHALL render `Card` and `Button` components generated in the configured shadcn UI path

### Requirement: API base URL comes from environment configuration
Frontend code MUST source backend base URL from Vite environment variables through a dedicated config module.

#### Scenario: Environment value is present
- **WHEN** developers inspect frontend environment defaults
- **THEN** `.env` SHALL include `VITE_API_BASE_URL=http://localhost:8000/api`

#### Scenario: Components avoid hardcoded API URL
- **WHEN** frontend modules need backend base URL
- **THEN** they SHALL consume `API_BASE_URL` from `src/config.ts`
- **AND** they SHALL NOT hardcode backend URLs in route components
