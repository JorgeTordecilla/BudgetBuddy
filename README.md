# BudgetBuddy

Monorepo de BudgetBuddy con backend API contract-first, frontend web y generación de SDKs.

## Stack
- Backend: FastAPI, SQLAlchemy, Pytest
- Frontend: React, TypeScript, Vite, React Query
- Specs: OpenAPI + OpenSpec
- SDKs: TypeScript y Python

## Estructura
- `backend/`: API y pruebas backend
- `frontend/`: aplicación web y pruebas frontend
- `openspec/`: cambios y specs funcionales
- `sdk/`: SDKs generados
- `tools/`: utilidades de validación/generación

## Requisitos
- Python 3.11+
- Node.js 20+
- npm

## Inicio rápido

### Backend
```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bat
cd frontend
npm install
npm run dev
```

## Verificación

### Backend
```bat
cd backend
.venv\Scripts\python.exe -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered
```

### Frontend
```bat
cd frontend
npm run test
npm run test:coverage
npm run build
```

## OpenAPI y SDK
Desde la raíz:

```bat
backend\.venv\Scripts\python.exe tools\validate_openapi.py
backend\.venv\Scripts\python.exe tools\generate_sdks.py
backend\.venv\Scripts\python.exe tools\generate_sdks.py --check
```

Salidas:
- `sdk/typescript/src/`
- `sdk/python/budgetbuddy_sdk/`

## Flujo OpenSpec
- Cambios activos: `openspec/changes/<change-name>/`
- Specs principales: `openspec/specs/`
- Archivo de cambios: `openspec/changes/archive/YYYY-MM-DD-<change-name>/`

Antes de archivar un cambio:
1. Sync de delta specs a main specs.
2. Validación del cambio.
3. Verificación de tests y build.

## Referencias
- Proyecto: `PROJECT.md`
- Deploy: `DEPLOYMENT.md`
- SDK: `sdk/README.md`
