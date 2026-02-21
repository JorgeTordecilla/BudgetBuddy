## Why

The monorepo currently has no runnable frontend application foundation, which blocks delivery of UI user stories and frontend-backend integration flow.  
We need a standard frontend bootstrap now so upcoming stories can focus on product behavior instead of repeated setup.

## What Changes

- Create a new `frontend/` Vite + React + TypeScript application skeleton.
- Add React Router route topology:
  - Public route: `/login`
  - Private routes: `/app` and `/app/dashboard`
  - Root redirect: `/` -> `/app/dashboard`
- Add temporary private-route guard that always redirects to `/login` (`authed = false`) until HU-FE-02.
- Add Tailwind CSS setup and initialize shadcn/ui baseline components (`Button`, `Card`).
- Add environment configuration:
  - `.env` with `VITE_API_BASE_URL=http://localhost:8000/api`
  - `src/config.ts` as the only frontend source for backend base URL.
- Add minimal authenticated layout shell (`AppShell`) with header + main content area and nested `Outlet`.
- No backend API contract change in this HU.

## Capabilities

### New Capabilities
- `frontend-routing-ui-foundation`: Frontend monorepo workspace bootstrap, routing separation (public/private), temporary auth gate semantics, UI system setup, and environment-based API config loading.

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `frontend/` workspace (new runtime foundation and route/layout files).
- APIs:
  - No impacted backend paths/components in `backend/openapi.yaml`.
  - No media type contract changes.
- Dependencies:
  - Frontend toolchain and UI dependencies for Vite React TS, routing, Tailwind, and shadcn/ui primitives.
- Systems:
  - Enables frontend development endpoint at `http://localhost:5173`.
  - Configures backend reference endpoint `http://localhost:8000/api` via environment variable.
