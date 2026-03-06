## Context

The current mobile PWA shell uses fixed bottom navigation, shared Radix dialog primitives, and shared date picker controls. Real-device checks show that viewport-safe bounds and focus behavior remain fragile in edge cases:
- bottom nav can visually exceed viewport width on some iPhone states.
- modal geometry relies on breakpoint-only rounding (`sm:*`) in base primitives.
- date/month controls include hidden focusable input paths that can trigger selection handles and virtual keyboard side effects.

These defects are user-visible in high-frequency paths (navigation, transactions, budgets), so the change should treat mobile shell stability as a cross-cutting frontend concern.

## Goals / Non-Goals

**Goals**
- Keep bottom mobile navigation fully inside visual viewport across iOS and Android.
- Ensure modal containers keep rounded geometry and clipping on narrow screens.
- Prevent date/month interaction from triggering hidden-input focus/selection artifacts.
- Validate behavior across iOS Safari/Chrome/Brave and Android Chrome/Brave (+ WebView where applicable).

**Non-Goals**
- Redesigning overall visual theme or desktop shell.
- Replacing all picker controls with a new third-party calendar UX.
- Changing backend APIs or auth/session contracts.

## Decisions

1. Use viewport-centered bounded width for mobile bottom nav
- Decision: move from edge-pinned (`inset-x-*`) sizing to bounded centered layout with safe-area-aware max width.
- Rationale: this reduces device-dependent overflow caused by visual viewport + notch insets.
- Android consideration: Chrome/WebView with dynamic toolbar must keep nav width stable during viewport height changes.

2. Apply explicit mobile rounding and clipping at modal container entry points
- Decision: enforce rounded corners in mobile dialog content classes (not only `sm:`), preserving `overflow-hidden`.
- Rationale: ensures consistent shape and avoids square-edge regressions when Radix base classes are reused.
- Android consideration: prevent anti-aliased edge bleed on high-density displays.

3. Remove or fully de-focus hidden date input interaction paths
- Decision: date/month field internals should not include focusable hidden controls that can receive tap focus on iOS.
- Rationale: avoids selection handles and unexpected keyboard activation.
- Android consideration: avoids ghost focus events in WebView where hidden controls can still trigger IME.

4. Validate with cross-platform regression matrix
- Decision: archive readiness requires explicit checks on iOS + Android for nav bounds, modal shape, and date interaction.
- Rationale: same CSS can pass desktop tests but regress mobile engines differently.

## Risks / Trade-offs

- [Risk] Tight width constraints can make nav labels truncate on very small Android devices.
  -> Mitigation: include minimum tap target rules and overflow-safe text strategy.

- [Risk] Modal rounding changes may affect screenshot/test snapshots.
  -> Mitigation: update tests with semantic assertions for class contracts rather than brittle pixel snapshots.

- [Risk] Date picker internals refactor can break existing tests that expect hidden input behavior.
  -> Mitigation: align tests to user-observable behavior (open picker, select value, no keyboard artifact triggers).

## Validation Matrix

- iOS Safari (latest stable): standalone + browser tab
- iOS Chrome/Brave (latest stable): standalone + browser tab
- Android Chrome (latest stable): standalone + browser tab
- Android Brave (latest stable): standalone + browser tab
- Android WebView container (if available): embedded flow sanity
