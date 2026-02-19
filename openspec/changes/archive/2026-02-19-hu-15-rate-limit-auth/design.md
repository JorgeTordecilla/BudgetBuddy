## Context

BudgetBuddy already enforces canonical media types and ProblemDetails semantics across auth endpoints, but it does not currently throttle repeated authentication attempts. `POST /auth/login` and `POST /auth/refresh` are high-value abuse targets and need deterministic request limiting that is testable, contract-aligned, and minimally invasive to existing auth behavior.

Constraints:
- Keep contract-first behavior aligned with `backend/openapi.yaml`.
- Keep success responses unchanged under normal traffic.
- Return canonical `429` as `application/problem+json` when throttled.
- Preserve deterministic tests in SQLite/in-memory test environments.

## Goals / Non-Goals

**Goals:**
- Add deterministic rate limiting for `POST /auth/login` and `POST /auth/refresh`.
- Support endpoint-specific limits (baseline: login `10/min`, refresh `30/min`).
- Return canonical `429` ProblemDetails and optional `Retry-After` header.
- Add optional temporary lock semantics keyed by username/IP for brute-force resistance.
- Keep behavior unchanged when requests are below configured thresholds.

**Non-Goals:**
- Full distributed abuse detection platform or WAF replacement.
- CAPTCHA, MFA, or device fingerprinting in this change.
- Global throttling for all API endpoints.
- Persistent audit event pipeline for security analytics.

## Decisions

1. Add a dedicated auth rate-limit guard in request handling path
- Decision: Implement a focused limiter check in auth request path (middleware/dependency helper) before login/refresh handlers execute.
- Rationale: Centralizes throttling logic while keeping auth router code readable and contract behavior consistent.
- Alternative: Inline checks in each endpoint handler. Rejected due to duplication and drift risk.

2. Use in-memory limiter for local/dev/tests and pluggable backend abstraction for prod
- Decision: Introduce an interface-style limiter with an in-memory implementation as default; keep Redis-ready abstraction for production migration.
- Rationale: Meets immediate needs with deterministic tests and no new mandatory infrastructure.
- Alternative: Redis-only implementation. Rejected because it complicates local and CI verification.

3. Enforce endpoint-scoped policies and key strategy
- Decision: Apply separate buckets for login and refresh:
  - login key: username + client IP (fallback IP-only when username unavailable)
  - refresh key: user/token subject + client IP where available
- Rationale: Better brute-force resistance than pure IP limits and less collateral blocking.
- Alternative: IP-only throttling. Rejected due to NAT/shared-network false positives.

4. Canonical `429` error taxonomy and response shape
- Decision: Add canonical ProblemDetails constant for rate limiting and return `status=429`, stable `type/title/status`, sanitized detail, and `Retry-After` header.
- Rationale: Preserves existing contract conventions and machine-readable client handling.
- Alternative: generic `400` or non-canonical ad-hoc payload. Rejected as contract drift.

5. Deterministic test strategy
- Decision: Make limiter windows configurable and test with low thresholds/controlled reset behavior to avoid flaky timing dependence.
- Rationale: Keeps integration tests stable and reproducible across environments.
- Alternative: real-time sleeping in tests. Rejected due to flakiness and slower CI.

## Risks / Trade-offs

- [In-memory limiter is process-local] -> Mitigation: keep backend abstraction and document Redis deployment path for horizontally scaled production.
- [Aggressive thresholds may block legitimate bursts] -> Mitigation: endpoint-specific configs and explicit `Retry-After` guidance.
- [Keying by username may be bypassed with random usernames] -> Mitigation: combine with IP dimension and optional lock semantics.
- [Proxy/IP extraction inconsistency] -> Mitigation: use consistent client-IP resolution policy and explicit fallback behavior.
- [Header and error mapping drift from contract] -> Mitigation: enforce OpenAPI + integration tests for canonical `429` and media types.

## Migration Plan

1. Extend OpenAPI (`backend/openapi.yaml`) for `429` responses and canonical error catalog entry.
2. Mirror OpenAPI updates in `openspec/specs/openapi.yaml`.
3. Add limiter configuration values and limiter implementation (in-memory default).
4. Integrate limiter checks for `POST /auth/login` and `POST /auth/refresh`.
5. Add `Retry-After` emission on throttled paths.
6. Add integration tests for limit exceedance and under-limit regression behavior.
7. Run full tests and coverage gate (`>= 90%`).

Rollback:
- Disable limiter via configuration and remove auth guard wiring while keeping auth handlers intact.
- Revert OpenAPI `429` mapping if full rollback is required.

## Open Questions

- Should temporary lock semantics be enabled by default or remain config-off initially?
- Should `Retry-After` be delta-seconds only or also expose absolute reset timestamp header?
- For refresh throttling, should keying prioritize refresh token hash, user id, or both?
