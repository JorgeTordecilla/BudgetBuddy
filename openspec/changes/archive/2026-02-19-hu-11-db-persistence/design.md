## Context

Current runtime behavior is contract-compliant and well-tested, but storage needs to move to a durable DB-backed architecture.

This change introduces a production-ready persistence baseline while preserving API surface and business behavior.

## Goals / Non-Goals

**Goals**
- Introduce SQLAlchemy DB session lifecycle with env-driven URL.
- Introduce Alembic migrations and initial schema revision.
- Use repository abstraction for DB-backed persistence in runtime paths.
- Keep API responses, media types, and ProblemDetails unchanged.
- Keep business-rule behavior unchanged.

**Non-Goals**
- API versioning or response-shape redesign.
- Query optimization beyond baseline indexing.
- Multi-database runtime support beyond Postgres + SQLite compatibility.

## Decisions

- Decision: Use SQLAlchemy engine/session factory from a dedicated DB module.
  - `DATABASE_URL` drives environment behavior.
  - Postgres for prod, SQLite supported for local/test.

- Decision: Use Alembic for schema evolution.
  - Initial migration includes all core entities:
    `User`, `Account`, `Category`, `Transaction`, `RefreshToken`.

- Decision: Introduce repository layer to isolate data access.
  - Routers/services depend on repository interfaces or thin adapters.
  - Existing business rules remain in current validation flows.

- Decision: Add baseline indexes for common access patterns.
  - User-scoped list queries and cursor/order queries.
  - Token lookup paths.

## Risks / Trade-offs

- Risk: behavior drift while replacing storage paths.
  -> Mitigation: keep existing integration suite and add DB fixture isolation.

- Risk: migration or session lifecycle misconfiguration.
  -> Mitigation: add explicit verification step with `alembic upgrade head`.

- Risk: SQLite/Postgres behavioral differences in tests.
  -> Mitigation: keep test fixtures deterministic and avoid DB-specific SQL in core paths.

## Migration Plan

1. Add SQLAlchemy + Alembic dependencies and env config.
2. Add DB session module and lifecycle hooks.
3. Implement models and indexes.
4. Generate initial Alembic migration.
5. Implement repositories and wire runtime paths.
6. Add/adjust test DB fixtures.
7. Run migrations + full test suite with coverage.

## Open Questions

- Should CI run on SQLite only, or include Postgres matrix as follow-up?
