## 1. DB Foundation

- [x] 1.1 Add SQLAlchemy + Alembic dependencies and config (env-driven DB URL)
- [x] 1.2 Add `backend/app/db/session.py` (engine/session factory) and lifecycle hooks

## 2. Models and Schema

- [x] 2.1 Create SQLAlchemy models: `User`, `Account`, `Category`, `Transaction`, `RefreshToken`
- [x] 2.2 Add indexes for common queries (`user_id + created_at/date`, token lookup, etc.)

## 3. Migrations

- [x] 3.1 Initialize Alembic and create initial migration for all tables
- [x] 3.2 Add `alembic upgrade head` to verification steps

## 4. Repository Layer

- [x] 4.1 Implement repository interfaces and DB-backed implementations
- [x] 4.2 Replace current storage paths to use repositories while preserving behavior

## 5. Tests

- [x] 5.1 Add test DB fixture (transaction rollback or ephemeral DB)
- [x] 5.2 Ensure suite remains green and deterministic

## 6. Contract Safety

- [x] 6.1 Ensure media types and ProblemDetails remain unchanged
- [x] 6.2 Ensure existing business rules remain enforced (archived, mismatch, ownership, conflicts)

## 7. Verification

- [x] 7.1 Run: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 7.2 Run: `alembic upgrade head`
- [x] 7.3 Confirm coverage remains `>= 90%`
