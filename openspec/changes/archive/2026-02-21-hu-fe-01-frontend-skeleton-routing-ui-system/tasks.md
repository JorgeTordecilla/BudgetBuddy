## 1. Frontend bootstrap

- [x] 1.1 Create Vite React TypeScript project skeleton under `frontend/`.
- [x] 1.2 Add required dependencies and scripts in `frontend/package.json`.
- [x] 1.3 Configure TypeScript project files (`tsconfig*`) for Vite React workflow.

## 2. Styling and UI foundation

- [x] 2.1 Configure Tailwind (`tailwind.config.*`, `postcss.config.*`, `src/index.css`).
- [x] 2.2 Initialize shadcn/ui structure and generate `Button` and `Card` primitives.
- [x] 2.3 Ensure login route consumes `Button` and `Card` to validate UI pipeline.

## 3. Routing and layout

- [x] 3.1 Implement router setup in `src/main.tsx` with nested route tree.
- [x] 3.2 Add `src/routes/RequireAuth.tsx` with temporary `authed = false` redirect logic.
- [x] 3.3 Add `src/routes/AppShell.tsx` with header/main layout and `Outlet`.
- [x] 3.4 Add `src/routes/Login.tsx` and `src/routes/Dashboard.tsx`.
- [x] 3.5 Add root redirect (`/` -> `/app/dashboard`) and private route guard wiring.

## 4. Runtime config

- [x] 4.1 Add `frontend/.env` with `VITE_API_BASE_URL=http://localhost:8000/api`.
- [x] 4.2 Add `frontend/src/config.ts` exporting `API_BASE_URL` from Vite env.
- [x] 4.3 Verify route components do not hardcode backend URL values.

## 5. Manual verification

- [x] 5.1 Run `npm install` in `frontend/`.
- [x] 5.2 Run `npm run dev` in `frontend/` and confirm server starts on `http://localhost:5173`.
- [x] 5.3 Verify `/login` renders with shadcn `Card` + `Button`.
- [x] 5.4 Verify `/app/dashboard` redirects to `/login`.

## 6. OpenSpec verification

- [x] 6.1 Run `openspec validate hu-fe-01-frontend-skeleton-routing-ui-system` from `frontend/`.
