## ADDED Requirements

### Requirement: Runtime persistence is backed by a real database
Domain entities MUST be persisted in a real relational database rather than ephemeral in-memory state.

#### Scenario: Entity writes survive process restart
- **WHEN** users create or update domain resources (`accounts`, `categories`, `transactions`)
- **THEN** persisted records SHALL remain available after process restart

#### Scenario: User-scoped reads use persisted records
- **WHEN** list or get endpoints read domain resources
- **THEN** responses SHALL be sourced from DB-backed persistence with existing ownership/business rule behavior unchanged

### Requirement: DB schema is managed with reproducible migrations
Schema changes MUST be tracked and applied through migrations.

#### Scenario: Initial schema migration creates core tables
- **WHEN** migration tool applies initial revision
- **THEN** tables for `users`, `accounts`, `categories`, `transactions`, and `refresh_tokens` SHALL be created

#### Scenario: Migration command succeeds in verification
- **WHEN** `alembic upgrade head` is executed
- **THEN** migration SHALL complete successfully on supported environment configuration

### Requirement: Query performance has baseline indexing
Persistence schema MUST include baseline indexes for common access patterns.

#### Scenario: User-scoped listing path is indexed
- **WHEN** list endpoints filter/sort by user and time fields
- **THEN** schema SHALL include indexes supporting `user_id` + ordering fields (`created_at` and/or `date`)

#### Scenario: Refresh token lookup path is indexed
- **WHEN** auth flows resolve refresh tokens
- **THEN** schema SHALL include an index suitable for token hash lookup
