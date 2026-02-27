## Context

This repository is a monorepo and the frontend must become an independent workspace under `frontend/` while staying aligned with backend conventions.  
HU-FE-01 is a bootstrap story: it must establish structure, route boundaries, and UI tooling without introducing real auth logic or backend calls.

Constraints:
- Work strictly inside `frontend/`.
- Keep private routes inaccessible until HU-FE-02.
- Keep backend base URL in environment config, not component literals.

## Goals / Non-Goals

**Goals:**
- Establish Vite React TypeScript scaffold for the frontend workspace.
- Define deterministic route model for public and private areas.
- Install Tailwind and shadcn/ui baseline components (`Button`, `Card`).
- Provide a minimal authenticated shell (`AppShell`) ready for nested pages.
- Centralize API base URL in `src/config.ts`.

**Non-Goals:**
- Implementing real authentication/session persistence.
- Calling backend endpoints from this HU.
- Building full feature screens beyond placeholders.
- Introducing automated frontend test suite in this HU.

## Decisions

### 1. Frontend workspace as a standalone app inside monorepo
- Decision: create and maintain all frontend runtime assets inside `frontend/`.
- Rationale: clear ownership boundary and predictable toolchain for future FE HUs.
- Alternative: coupling frontend output into backend static pipeline.
  - Rejected due higher coupling and slower frontend iteration.

### 2. Router with explicit public/private split
- Decision:
  - `/login` public
  - `/app` and `/app/dashboard` private behind `RequireAuth`
  - `/` redirects to `/app/dashboard`
- Rationale: enforces a stable mental model and avoids route drift early.
- Alternative: single flat route table without guard wrapper.
  - Rejected due weaker separation for upcoming auth work.

### 3. Temporary hard-block auth guard
- Decision: `RequireAuth` uses deterministic `const authed = false`.
- Rationale: guarantees private routes are blocked in all sessions until real auth implementation.
- Alternative: pseudo-auth with local storage mock.
  - Rejected due misleading behavior and migration risk.

### 4. Tailwind + shadcn baseline now
- Decision: initialize Tailwind and add `Button` + `Card` immediately.
- Rationale: validates style pipeline and component primitives from day one.
- Alternative: defer shadcn to later HU.
  - Rejected because that delays UI-system consistency and causes rework.

### 5. Environment-only backend URL source
- Decision: `VITE_API_BASE_URL` in `.env`, exported by `src/config.ts`.
- Rationale: prevents hardcoded URL spread and supports multi-environment runtime.
- Alternative: inline URL constants in components.
  - Rejected as non-compliant with maintainability requirements.

## Risks / Trade-offs

- [Risk] Initial scaffold tooling can fail in restricted/offline environments. -> Mitigation: keep required file set explicit and reproducible in repo.
- [Risk] Developers may misinterpret private-route redirect as a bug. -> Mitigation: document temporary guard behavior in code comments/tasks.
- [Risk] shadcn output path inconsistency across machines. -> Mitigation: choose one canonical path and use it consistently from this HU onward.

## Migration Plan

1. Bootstrap frontend workspace files in `frontend/`.
2. Configure Tailwind and shadcn baseline components.
3. Implement router tree and temporary `RequireAuth`.
4. Add `.env` and `src/config.ts`.
5. Perform manual runtime checks (`npm install`, `npm run dev`, route validation).

Rollback:
- Revert `frontend/` scaffold files and remove HU change artifacts if bootstrap fails validation.
