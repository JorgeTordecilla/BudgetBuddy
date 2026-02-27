## Context

El cambio corrige fallas detectadas en flujos criticos de autenticacion y navegacion: logout no resiliente ante errores, redireccion post-restauracion no determinista, y estado de filtros/rangos que no se mantiene alineado con URL. El frontend opera con React Router + TanStack Query y cliente API contract-first, por lo que los ajustes deben preservar media types (`application/vnd.budgetbuddy.v1+json`, `application/problem+json`) y semantica ProblemDetails sin modificar contratos backend.

Tambien se detecto deuda de accesibilidad en modales/dialogos reutilizables y exposicion innecesaria de configuracion operativa en login. La solucion debe mantener comportamiento consistente en desktop/mobile y no degradar cobertura ni estabilidad de pruebas.

## Goals / Non-Goals

**Goals:**
- Garantizar cierre de sesion determinista en cliente aunque falle `/auth/logout`.
- Asegurar redireccion post-login/restauracion hacia `location.state.from` cuando exista.
- Sincronizar query params con estado de vistas en `transactions`, `analytics` y `budgets` para navegacion confiable (deep links/back-forward).
- Estandarizar taxonomia de errores de auth/session y su representacion UX (inline/toast) sin filtrar datos sensibles.
- Adoptar base de dialogo accesible (focus trap, restore focus, escape handling, aria completa) para componentes modales compartidos.
- Mantener estrategia de cache/invalidation acotada y predecible en TanStack Query para evitar refetches innecesarios.

**Non-Goals:**
- No introducir cambios en OpenAPI paths, schemas o media types.
- No rediseñar visual completo del dashboard ni tablas.
- No migrar toda la capa UI a nuevos componentes fuera del alcance de dialogos usados en flujos afectados.
- No alterar reglas de negocio backend (conflicts, rate-limit, auth policy).

## Decisions

1. **Logout resiliente por contrato de cliente**
- Decision: `logout` limpiara estado local en `finally`, con navegacion a `/login` y sin depender de exito de red.
- Rationale: evita sesiones residuales en cliente y reduce riesgo de lock-in UI.
- Alternative considered: mantener limpieza solo si backend responde 2xx.
  - Rechazada porque degrada seguridad/UX ante fallos transitorios.

2. **Redireccion canonica con `from` en login/restauracion**
- Decision: usar destino `from` validado como ruta interna permitida; fallback `/app/dashboard`.
- Rationale: preserva deep links protegidos y evita regresion de flujo.
- Alternative considered: redirigir siempre a dashboard.
  - Rechazada por romper continuidad de tarea del usuario.

3. **Sincronizacion URL <-> estado en vistas con filtros/rangos**
- Decision: introducir un patron comun:
  - parseo inicial de search params
  - efecto de resync cuando cambian params
  - actualizacion de URL al aplicar cambios de filtros/rangos.
- Rationale: elimina divergencia entre estado local y ubicacion del router.
- Alternative considered: mantener estado local unico tras primer render.
  - Rechazada por inconsistencias en navegacion browser.

4. **Taxonomia de errores y constantes canonicas**
- Decision: centralizar constantes ProblemDetails relevantes para auth/session y mapping UI (ej. unauthorized, forbidden, network, unknown).
- Rationale: reduce duplicacion, evita mensajes inconsistentes y facilita pruebas por tipo de error.
- Alternative considered: mapeo ad hoc por pantalla.
  - Rechazada por alta probabilidad de drift entre modulos.

5. **Arquitectura de boundaries frontend**
- Decision:
  - `api/*`: solo I/O y normalizacion de errores.
  - `auth/*`: ciclo de sesion y estado autenticado.
  - `routes/*`: guards y redireccion.
  - `features/pages/*`: estado de pantalla + sincronizacion con URL + acciones de usuario.
  - `components/*`: UI pura y accesibilidad.
- Rationale: separacion clara evita mezclar reglas de sesion, redireccion y presentacion.
- Alternative considered: resolver redireccion/filtros dentro de componentes UI.
  - Rechazada por baja mantenibilidad.

6. **Cache/invalidation strategy**
- Decision:
  - invalidaciones por dominio (`transactions`, `analytics`, `budgets`) solo tras mutaciones exitosas.
  - evitar invalidacion global no acotada.
  - mantener `retry: false` global y control explicito por flujo critico.
- Rationale: minimiza tormentas de refetch y mantiene UX estable.
- Alternative considered: invalidar amplias jerarquias de queries en cada mutacion.
  - Rechazada por impacto de performance y parpadeo de UI.

7. **Accesibilidad y responsive en dialogos**
- Decision: usar primitiva de dialogo accesible (o hardening equivalente) con:
  - focus trap while open
  - focus restore al cerrar
  - cierre por escape y dismiss controlado
  - roles/aria completos y orden de tab consistente
  - comportamiento usable en mobile y desktop.
- Rationale: cumplimiento a11y y consistencia UX.
- Alternative considered: mantener overlays custom actuales.
  - Rechazada por riesgo de regresion de teclado/lectores de pantalla.

8. **Hardening de informacion operativa**
- Decision: ocultar `API_BASE_URL` en login fuera de entorno de desarrollo.
- Rationale: reduce exposicion operativa innecesaria sin afectar debugging local.
- Alternative considered: mantener visible siempre.
  - Rechazada por principio de minima exposicion.

## Risks / Trade-offs

- **[Riesgo]** Limpieza local en logout podria ocultar fallas reales del backend.  
  **Mitigacion:** registrar fallo en diagnostico/toast no bloqueante y conservar `requestId` cuando exista.

- **[Riesgo]** Resync URL-estado puede generar loops si no se compara estado previo.  
  **Mitigacion:** aplicar guards de igualdad antes de setState/navigate y normalizar params.

- **[Riesgo]** Cambio de base modal puede afectar tests existentes por diferencias de markup.  
  **Mitigacion:** ajustar tests a comportamiento (teclado/foco/aria) en vez de snapshots fragiles.

- **[Riesgo]** Mayor consistencia de errores puede cambiar texto mostrado esperado por tests.  
  **Mitigacion:** validar por tipo/status/requestId ademas de mensajes.

- **[Trade-off]** Implementar sincronizacion bidireccional aumenta complejidad en páginas con muchos filtros.  
  **Mitigacion:** encapsular parse/serialize en utilidades por feature para mantener legibilidad.

## Migration Plan

1. Implementar hardening de `api/client` y `AuthContext` para logout resiliente.
2. Ajustar `Login` para redireccion canonica con `from` seguro.
3. Aplicar patron URL-state sync en `transactions`, `analytics`, `budgets`.
4. Remover exposicion de `API_BASE_URL` en login no-dev.
5. Refactorizar dialogos/modales a base accesible comun.
6. Actualizar/crear pruebas unitarias e integracion para auth, routing, query-state y a11y.
7. Ejecutar `npm run test`, `npm run test:coverage`, `npm run build`.
8. Rollback: revertir cambios frontend del change; no hay migracion de datos ni contrato backend.

## Open Questions

- Confirmar si se adopta primitiva de dialogo existente del design system o se fortalece la implementacion custom actual.
- Definir si la validacion de `from` usara allowlist explicita de rutas `/app/*` o utilitario central de safe redirect.
- Acordar si mensajes de error de logout fallido deben mostrarse siempre o solo en `DEV`.
