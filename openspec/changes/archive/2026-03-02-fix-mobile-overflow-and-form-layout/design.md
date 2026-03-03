## Context

The current mobile experience in Transactions and Analytics shows horizontal overflow in date/filter controls and occasional content occlusion caused by fixed bottom navigation plus floating transaction action controls. Modal forms also risk constrained usability on small viewports when intrinsic control widths and footer actions compete for limited space.

This change is frontend-only and cross-cutting across shared form styles, app shell layout, route-level filter surfaces, and modal containers. API contracts and ProblemDetails behavior are unchanged.

## Goals / Non-Goals

**Goals:**
- Guarantee no horizontal overflow for form controls (including date inputs/selects) in mobile page surfaces and modals.
- Preserve access to primary content/actions when fixed mobile navigation and FAB coexist.
- Keep interactions mobile-first while preserving desktop behavior and accessibility semantics.
- Keep contract-first API behavior unchanged.

**Non-Goals:**
- No backend or OpenAPI changes.
- No redesign of data models, endpoint payloads, or auth/session lifecycle.
- No visual rebrand beyond responsive hardening.

## Decisions

1. Strengthen shared field primitives instead of patching individual screens only.
- Decision: update shared `.field-input` and date-input constraints with `min-w-0` and `max-w-full`.
- Rationale: date controls are intrinsic-size-sensitive and appear across multiple routes/modals.
- Alternative considered: per-component width patches only. Rejected due to drift and repeated regressions.

2. Introduce viewport-safe bottom spacing at app-shell level for mobile.
- Decision: increase mobile bottom padding and align fixed nav offset with safe-area insets.
- Rationale: prevents clipped last-content rows and overlapping tap targets when bottom nav and FAB are present.
- Alternative considered: page-specific paddings. Rejected due to inconsistency and maintenance overhead.

3. Use mobile-first control stacking for analytics and transaction filter groups.
- Decision: make narrow-view control groups stack and apply full-width action affordances where needed.
- Rationale: avoids compressed inline controls that force overflow or unreadable touch targets.
- Alternative considered: retain compact inline layout everywhere. Rejected for narrow viewport readability.

4. Constrain modal scroll regions against horizontal overflow.
- Decision: ensure modal content area blocks horizontal overflow while preserving vertical scrolling.
- Rationale: modal forms with long labels/date controls must remain operable under keyboard and constrained heights.
- Alternative considered: allow modal x-scroll. Rejected as poor UX and error-prone on touch devices.

## Risks / Trade-offs

- [Risk] Increased bottom spacing may feel excessive on some mobile devices.
  -> Mitigation: use safe-area-aware `calc(...)` spacing and keep desktop unaffected.

- [Risk] Hiding duplicate top CTA in mobile transactions might reduce discoverability for some users.
  -> Mitigation: preserve persistent FAB with accessible label and equivalent action semantics.

- [Risk] CSS utility hardening can break strict string-based tests.
  -> Mitigation: update CSS assertions to the new shared style contract.

## Migration Plan

- Deploy as frontend-only patch release.
- Validate with existing Vitest route/component suites and CSS assertion tests.
- Rollback strategy: revert frontend commit set touching app shell, route layout, modal, and shared form styles.

## Open Questions

- Should similar mobile overflow hardening be standardized now for Budgets/Accounts/Categories filters as a follow-up change?
