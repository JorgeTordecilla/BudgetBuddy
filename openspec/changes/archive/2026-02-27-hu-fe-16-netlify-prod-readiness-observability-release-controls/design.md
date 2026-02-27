## Context

BudgetBuddy frontend already introduced baseline Netlify readiness in HU-FE-14 (env contract, SPA redirects, basic smoke, error boundary). This change hardens production operations with explicit release controls, stronger observability signal quality, and stricter deployment/runtime guardrails.

Current constraints:
- Frontend is a SPA (Vite/React) hosted separately from backend API.
- Auth uses bearer access token + cross-site refresh cookie contract.
- Error contract is ProblemDetails with `X-Request-Id` correlation.
- Existing quality gates include tests/build/coverage, but release blocking and traceability are not fully formalized.

## Goals / Non-Goals

**Goals:**
- Standardize Netlify production deploy contract (build/publish/routing/headers).
- Standardize runtime env contract including release identity.
- Capture actionable observability context (ProblemDetails + request correlation + release/environment).
- Establish release controls with smoke checks for critical auth/navigation flows.
- Validate cross-site compatibility assumptions explicitly in production-ready requirements.

**Non-Goals:**
- No new business-domain features (transactions/budgets/analytics semantics unchanged).
- No backend deployment implementation changes (only compatibility expectations).
- No advanced WAF/CDN policy design.

## Decisions

### Decision 1: Use `netlify.toml` as canonical deploy configuration
- **Why:** Keeps redirects, build settings, and security headers versioned and reviewable in one place.
- **Alternative considered:** `_redirects` + Netlify UI headers/env. Rejected due to drift and low traceability.

### Decision 2: Require explicit production env contract in frontend runtime
- Required keys: `VITE_API_BASE_URL`, `VITE_APP_ENV`, `VITE_RELEASE`; optional feature flags remain explicit (`VITE_FEATURE_*`).
- **Why:** Prevent hidden fallback to dev values and support release-level diagnostics.
- **Alternative considered:** infer values at runtime only. Rejected due to ambiguous behavior across previews/prod.

### Decision 3: Extend error observability via existing API error normalization layer
- Attach `problem.type`, `problem.status`, `problem.title`, `x-request-id`, `path`, `method`, `release`, `environment` to telemetry events.
- Redact secrets and avoid request body/token/cookie capture.
- **Why:** Preserves existing error architecture and minimizes integration risk.
- **Alternative considered:** add parallel logging layer per page. Rejected due to duplication and inconsistency.

### Decision 4: Security-header baseline enforced at Netlify edge
- Minimum baseline: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, conservative `Content-Security-Policy`.
- **Why:** Fast reduction of browser attack surface without backend changes.
- **Alternative considered:** postpone CSP to later HU. Rejected because production hardening is this HU purpose.

### Decision 5: Release controls use CI gate with smoke tests as promotion blocker
- Pipeline includes lint/test/build + smoke flows: login -> dashboard -> analytics -> logout.
- Production promotion should fail fast when smoke fails.
- **Alternative considered:** manual QA-only gate. Rejected due to inconsistency and delayed feedback.

## Risks / Trade-offs

- **[Risk] CSP breaks third-party scripts or telemetry ingestion** ? **Mitigation:** start with conservative allowlist and verify in preview before production promote.
- **[Risk] Smoke tests flaky due to shared test accounts** ? **Mitigation:** use deterministic test users/seed strategy and isolate environment state.
- **[Risk] Over-collection in telemetry** ? **Mitigation:** explicit redaction rules and allowlisted metadata only.
- **[Risk] Cross-site cookie behavior differs by browser policy** ? **Mitigation:** define browser validation checklist and require credentials+origin checks in verification steps.

## Migration Plan

1. Add/adjust production config and netlify routing/header policy.
2. Add release/env propagation and observability metadata enrichment.
3. Add/adjust smoke tests and CI gating rules.
4. Validate on Netlify preview (deep links, auth refresh, telemetry context).
5. Promote to production after smoke + manual checklist pass.
6. Rollback by redeploying previous Netlify release and reverting env/release metadata if needed.

## Open Questions

- Should smoke test be blocking for all branches or only for `main` promotion?
- Should preview deployments always send telemetry, or only production DSN-enabled builds?
- What exact initial CSP `connect-src` list is required for API + telemetry endpoints in each environment?
