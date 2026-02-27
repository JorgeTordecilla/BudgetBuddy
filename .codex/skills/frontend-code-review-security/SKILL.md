---
name: frontend-code-review-security
description: Perform frontend code reviews for this project stack (Vite, React, TypeScript, React Router, React Query, Tailwind, shadcn/ui) with emphasis on correctness, regressions, maintainability, performance, and security. Use when reviewing PRs, validating change implementations, investigating UI/auth/session issues, or assessing frontend production readiness.
---

# Frontend Code Review Security

## Review Workflow

1. Identify the exact change scope.
- Use `git diff --name-only` or targeted file reads.
- Prioritize changed files under `frontend/src`, `frontend/tests`, and config/runtime files.

2. Evaluate critical correctness first.
- Check route behavior, guards, form flows, and state transitions.
- Verify API contract handling: media types, ProblemDetails parsing, headers, retry behavior.
- Confirm no obvious regressions in login/refresh/logout/session hydration.

3. Evaluate security and trust boundaries.
- Check token/cookie handling, auth redirects, and retry loops.
- Validate unsafe render paths (`dangerouslySetInnerHTML`, untrusted URL construction).
- Verify secrets are not logged and sensitive payloads are not persisted in browser storage.

4. Evaluate performance and UX stability.
- Check unnecessary re-renders, query invalidation scope, and retry storms.
- Check loading/empty/error states and user-visible loops/flicker.
- Check mobile layout breakage in changed responsive components.

5. Evaluate test coverage for changed behavior.
- Confirm unit/integration tests cover new branches and edge cases.
- Prefer targeted tests for auth/session concurrency, 401/403/429 handling, and error mapping.

6. Report findings in priority order.
- Use `CRITICAL`, `WARNING`, `SUGGESTION`.
- Include actionable fixes with file references.
- If no findings, state that explicitly and mention residual risks/testing gaps.

## Stack-Specific Checks

### React + Router
- Prevent redirect loops between `/login` and protected routes.
- Keep guard loading states deterministic; avoid infinite bootstrap cycles.
- Ensure manual logout does not trigger immediate refresh loops.

### React Query
- Keep retry strategy explicit for 4xx vs transient failures.
- Avoid over-invalidating cache on mutations.
- Ensure query keys are stable and include active filters.

### API Client and Auth
- Keep access token in memory only.
- Keep refresh token cookie-only (`credentials: "include"` where needed).
- Limit 401 refresh retry to one attempt per request and deduplicate concurrent refresh calls.
- Treat 401/403 refresh failures as terminal auth state; avoid toast spam loops.

### Tailwind + shadcn/ui
- Preserve visual consistency with existing design tokens/components.
- Avoid ad-hoc styles when component primitives already exist.
- Validate responsiveness for changed layouts at mobile breakpoints.

## Security Review Focus

- Authentication/session:
  - No token leaks in logs or UI diagnostics.
  - No insecure token persistence (`localStorage`/`sessionStorage`) unless explicitly justified.
- Input/output handling:
  - Sanitize or avoid raw HTML injection.
  - Validate and encode user-controlled values in URLs/query strings.
- Browser security posture:
  - Keep CORS/cookie assumptions coherent with backend contract.
  - Verify rate-limit and ProblemDetails handling do not expose sensitive internals.

## References

- For deep checks, load: `references/frontend-review-checklist.md`.
