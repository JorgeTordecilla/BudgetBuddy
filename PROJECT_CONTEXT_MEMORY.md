# Project Context & Memory

Ultima actualizacion: 2026-02-18

## 1) Objetivo del proyecto
BudgetBuddy implementa un backend **contract-first** en FastAPI basado en `backend/openapi.yaml`.

Contrato clave:
- Success payload: `application/vnd.budgetbuddy.v1+json`
- Error payload: `application/problem+json` con `ProblemDetails`

Dominios implementados:
- Auth: register/login/refresh/logout
- Accounts
- Categories
- Transactions
- Analytics (`by-month`, `by-category`)

## 2) Estructura relevante
- `backend/app/main.py`: app FastAPI, middleware de contrato, lifespan
- `backend/app/core/`: config, constants, errors, responses, pagination, security
- `backend/app/routers/`: auth/accounts/categories/transactions/analytics
- `backend/app/models.py`: modelos SQLAlchemy
- `backend/app/schemas.py`: schemas Pydantic
- `backend/migrations/001_init.sql`: esquema inicial DB
- `backend/tests/`: tests de contrato, integracion y unitarios
- `openspec/changes/backend-fastapi/`: artifacts OpenSpec (proposal/design/specs/tasks)

## 3) Estado actual
- OpenSpec change `backend-fastapi`: **completo (27/27 tasks)**
- Test suite backend: **10 passed**
- Coverage backend (`app`): **92%**

Comando validado (desde `backend`, con venv activado):
```bat
call .venv\Scripts\activate.bat && py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered
```

## 4) Decisiones tecnicas importantes
- Se migró `on_event("startup")` a `lifespan` para evitar deprecations en FastAPI.
- `utcnow()` reemplazado por `datetime.now(UTC)` y normalizacion UTC en refresh token checks.
- Para tests, DB SQLite aislada configurada en `backend/tests/conftest.py` con reset por test.
- Agregado `.gitignore` para artefactos locales (`__pycache__`, `.coverage`, `.env`, `.tmp`, `*.db`, etc).

## 5) Ramas/commits relevantes
Historial actual en `master`:
- `3f7a57f` `chore(repo): initialize OpenSpec workflow and API contract`
- `a73c9c0` `feat(backend): implement fastapi API contract and 92% coverage`

Notas de reescritura:
- Se corrigio el commit antiguo `a1cfb2f...` (mensaje y limpieza de artifacts compilados).
- Rama de respaldo disponible: `backup/pre-rewrite-a1cfb2f`

## 6) Convenciones operativas
- Para coverage y tests en este entorno, conviene usar venv del proyecto.
- Si hay problemas de `tempdir`, usar un temp local o `c:\temp`.
- Si `py -m pytest` no reconoce `--cov`, confirmar que el venv activo tenga `pytest-cov`.

## 7) Pendientes/atencion
- `openspec/specs/engineering-standards.md` aparece como archivo no trackeado en working tree.
- Si se va a push remoto tras reescritura de historia, usar `--force-with-lease`.

## 8) Comandos rapidos
Desde `backend`:
```bat
call .venv\Scripts\activate.bat
py -m pytest tests -q -s
py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered
```

Desde raiz:
```bat
openspec.cmd status --change "backend-fastapi"
openspec.cmd instructions apply --change "backend-fastapi" --json
```
