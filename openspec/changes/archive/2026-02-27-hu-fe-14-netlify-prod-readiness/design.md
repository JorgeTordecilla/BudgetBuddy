## Context

The app already implements contract-first API usage, cookie-based refresh sessions, and ProblemDetails mapping. Production deployment still has gaps around deploy routing, env governance, global runtime diagnostics, and deploy-level smoke confidence.

This change standardizes production readiness for Netlify without expanding business features.

## Goals / Non-Goals

**Goals:**
- Ensure all API traffic uses environment-driven base URL configuration.
- Prevent SPA route 404s on Netlify deep links.
- Provide global runtime failure fallback with diagnostic copy payload.
- Preserve and document cross-site cookie auth requirements for production.
- Add lightweight e2e smoke checks for login and dashboard navigation.

**Non-Goals:**
- Implement full observability platform integration (e.g., full Sentry rollout).
- Introduce new auth semantics or CSRF strategy changes.
- Add broad e2e business-flow coverage beyond smoke baseline.

## Decisions

1. Runtime env centralization
- Decision: Create a single frontend env module (`src/config/env.ts`) and consume it from API client and app metadata.
- Rationale: Prevent scattered `import.meta.env` access and hidden defaults.

2. Netlify SPA fallback
- Decision: Use static redirect rule (`/* /index.html 200`) through `_redirects` (or equivalent `netlify.toml`).
- Rationale: Guarantees hard-refresh compatibility for React Router browser history mode.

3. Runtime error fallback + diagnostics
- Decision: Add a root ErrorBoundary with fallback UI including:
  - reload action
  - copy diagnostic payload (`request_id`, `problem_type`, `path`, `timestamp`)
- Rationale: Supportability and incident triage without backend log access.

4. Diagnostics state source
- Decision: Introduce lightweight diagnostics store for latest request-id and error metadata updated by API error normalization paths.
- Rationale: Keep ErrorBoundary and error surfaces consistent without duplicating parsing logic.

5. E2E smoke scope
- Decision: Add Playwright smoke for:
  - login page render
  - successful login flow
  - authenticated dashboard navigation
- Rationale: Small but high-value confidence gate for deploy previews.

6. Security documentation scope
- Decision: Document cross-site cookie requirements in frontend README (CORS allowlist + credentials + cookie attributes) and explicitly log CSRF as a known follow-up risk.
- Rationale: Prevent configuration drift between frontend deploy and backend session behavior.

## Risks / Trade-offs

- [Risk] Smoke tests may be flaky when test credentials or seed data are unstable.
  - Mitigation: Use dedicated `E2E_USERNAME`/`E2E_PASSWORD` and keep assertions minimal.
- [Risk] Diagnostics payload could accidentally include sensitive content.
  - Mitigation: Restrict copied diagnostics to non-secret metadata only.
- [Risk] Teams may assume CSRF is solved once cross-site auth works.
  - Mitigation: Document explicit non-goal and follow-up HU requirement.

## Migration Plan

1. Add env module and `.env.example` contract.
2. Add Netlify redirect file and verify deep-link routing behavior.
3. Add ErrorBoundary + diagnostics store wiring at app root.
4. Extend error UX paths for request-id persistence and 429 retry hints.
5. Add Playwright config + smoke spec + npm script.
6. Update frontend README with production checklist and troubleshooting.

## Open Questions

- Should smoke tests run only on deploy previews/main or also on local CI-by-default?
- Should `VITE_APP_ENV=production` enforce stricter frontend runtime assertions at startup?
- Is Sentry wiring required now or deferred behind the optional DSN toggle?
