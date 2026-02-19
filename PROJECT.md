# Project

## Name
BudgetBuddy

## Goal
Implement and maintain a contract-first personal finance backend where behavior is driven by OpenAPI and refined through OpenSpec changes.

## Primary Contracts
- Main API contract: `backend/openapi.yaml`
- OpenSpec mirror contract: `openspec/specs/openapi.yaml`

## API Conventions
- Success media type: `application/vnd.budgetbuddy.v1+json`
- Error media type: `application/problem+json`
- Error model: ProblemDetails (`type`, `title`, `status`, optional `detail`/extensions)

## Technology Stack
- Python + FastAPI
- SQLAlchemy ORM
- Postgres (Neon) as target DB
- SQLite for isolated tests
- Pytest + pytest-cov

## Functional Scope
- Auth: register, login, refresh, logout
- Accounts: CRUD + archive semantics
- Categories: CRUD + type constraints
- Transactions: CRUD + filters + domain rules
- Analytics: by-month and by-category reports

## Key Business Rules
- Cannot create transactions on archived accounts (`409`, canonical ProblemDetails).
- Transaction `type` must match `category.type` on create/update (`409`, canonical ProblemDetails).

## OpenSpec Workflow
- Changes live in `openspec/changes/<change-name>/` until archived.
- Main specs live in `openspec/specs/` and must be synced before archive.
- Archive path: `openspec/changes/archive/YYYY-MM-DD-<change-name>/`.

## Testing Baseline
From `backend/` with virtual environment active:

```bat
call .venv\Scripts\activate.bat
py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered
```

## Engineering Notes
- Keep implementation and tests strictly aligned with OpenAPI response codes, schemas, and media types.
- Prefer centralized error constants/helpers (`app/errors.py`) for canonical ProblemDetails.
- Preserve idempotent, minimal updates when syncing OpenSpec deltas into main specs.
- All changes must keep test coverage ≥ 90% (enforced by pytest-cov fail-under).
- All endpoints must have contract tests aligned with openapi.yml.
## OpenAPI + SDK Commands
From repository root:

```bat
backend\.venv\Scripts\python.exe tools\validate_openapi.py
backend\.venv\Scripts\python.exe tools\generate_sdks.py
backend\.venv\Scripts\python.exe tools\generate_sdks.py --check
```

Generated SDK outputs:
- `sdk/typescript/src/`
- `sdk/python/budgetbuddy_sdk/`
