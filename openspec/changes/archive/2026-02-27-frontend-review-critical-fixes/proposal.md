## Why

El review de frontend identifico riesgos reales en cierre de sesion, redireccionamiento y sincronizacion de estado con URL que pueden romper flujos principales y generar comportamientos inconsistentes para usuarios autenticados. Este cambio es necesario ahora para eliminar riesgo operativo en autenticacion, endurecer UX en rutas protegidas y cerrar brechas de accesibilidad antes de seguir agregando funcionalidades.

## What Changes

- Corregir el flujo de logout para que siempre limpie estado local de sesion y navegue a `/login` incluso ante fallas de red o backend, evitando sesiones "atascadas" en cliente.
- Alinear redireccion de login restaurado con `location.state.from` para respetar deep links protegidos y evitar regresion de navegacion a dashboard por defecto.
- Sincronizar filtros/rangos derivados de query params en rutas clave para evitar estado local obsoleto cuando cambia la URL (navegacion interna, back/forward, links compartidos).
- Retirar exposicion del `API_BASE_URL` en UI de login en runtime no desarrollo.
- Mejorar semantica y comportamiento de modales/dialogos para accesibilidad de teclado y foco (trap/restore/escape consistente).
- Endurecer cobertura de pruebas para los caminos anteriores (auth/session, rutas protegidas y estados UI).

## Capabilities

### New Capabilities

- `frontend-auth-logout-resilience`: define comportamiento obligatorio de logout tolerante a error, limpieza local garantizada y salida determinista de rutas protegidas.
- `frontend-route-query-state-sync`: define sincronizacion bidireccional entre URL search params y estado de pantalla en vistas con filtros/rangos.
- `frontend-modal-a11y-foundation`: define requisitos minimos de accesibilidad para dialogos/modales reutilizables en frontend.

### Modified Capabilities

- `frontend-session-lifecycle`: cambia requisitos de cierre de sesion y redireccion post-restauracion para respetar destino original (`from`) y evitar estado autenticado residual.
- `frontend-transactions-management`: cambia requisitos de inicializacion/sincronizacion de filtros por URL para transacciones y comportamiento esperado en navegacion.
- `frontend-analytics-dashboard`: cambia requisitos de lectura y sincronizacion de rango desde query params para dashboard/analytics links.
- `frontend-budget-management`: cambia requisitos de aplicacion de `month` via URL en navegacion entre dashboard y budgets.
- `frontend-error-ux`: cambia requisitos de presentacion segura de datos operativos en login y estandar de errores UX en auth flows.

## Impact

- Frontend routes y flujos afectados:
  - `/login`
  - `/app/*` (especialmente `/app/dashboard`, `/app/analytics`, `/app/budgets`, `/app/transactions`)
- Modulos principales:
  - `frontend/src/api/client.ts`
  - `frontend/src/auth/AuthContext.tsx`
  - `frontend/src/routes/Login.tsx`
  - `frontend/src/routes/AppShell.tsx`
  - `frontend/src/features/*` y `frontend/src/pages/*` con `useSearchParams`
  - componentes de dialogo/modal reutilizables
- Impacto OpenAPI/contract:
  - Sin cambios de paths ni schemas en `backend/openapi.yaml`; se mantiene compatibilidad hacia atras.
  - Paths impactados en uso frontend (sin cambio de contrato): `/auth/logout`, `/auth/refresh`, `/me`, endpoints de `transactions`, `analytics`, `budgets`.
  - Se mantiene cumplimiento estricto de media types:
    - success: `application/vnd.budgetbuddy.v1+json`
    - error: `application/problem+json`
- Dependencias/sistemas:
  - Sin nuevas dependencias backend.
  - Posible adopcion o refactor de primitivas de dialogo en frontend para cumplimiento a11y.
  - Se amplian tests de Vitest/Testing Library en auth, routing, query-state y dialogs.
