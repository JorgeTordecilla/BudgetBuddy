## Why

The API behavior and tests are solid, but without real persistent storage it is not deployable or reliable in production. In-memory or ad-hoc storage creates data-loss risk, weak concurrency behavior, and limited performance.

HU-11 establishes a real persistence baseline with migrations, while preserving API contract behavior.

## What Changes

- Introduce real DB persistence:
  - PostgreSQL for production.
  - SQLite option for local dev/test.
- Add SQLAlchemy session foundation and Alembic migrations.
- Implement DB-backed repositories and replace current storage access paths.
- Keep HTTP contract unchanged:
  - same media types
  - same ProblemDetails
  - same business rules (archived/mismatch/conflict/ownership behavior).

## Capabilities

### New Capabilities
- Real persistence with reproducible schema migrations.

### Modified Capabilities
- Data access layer implementation, without changing API shape.

## Impact

- Backend:
  - DB/session modules.
  - Repository modules and router integration paths.
  - Migration infrastructure (Alembic).
- Tests:
  - isolated DB fixture with deterministic execution.
- CI/local:
  - migration command execution (`alembic upgrade head`).

## Definition of Done

- End-to-end DB persistence works for all modules.
- Tests pass and coverage remains >= 90%.
- `alembic upgrade head` runs successfully.
- API contract remains unchanged in shape and semantics.

## NFR

- Security: DB credentials via env, no secrets in logs.
- Performance: baseline indexes for common list/pagination/query paths.
- Reliability: reproducible migrations.
