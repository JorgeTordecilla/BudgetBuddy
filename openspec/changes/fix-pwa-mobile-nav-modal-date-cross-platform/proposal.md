## Why

PWA mobile flows still show layout regressions on real devices:
- iPhone bottom navigation container can exceed the visual viewport bounds in standalone and in-browser contexts.
- modal surfaces can appear square-edged and visually clipped on narrow screens.
- date/month fields inside modals can trigger text selection and keyboard artifacts (notably iOS), producing unstable UX.

These issues are UX-critical because they affect primary navigation and form completion paths. They also have cross-platform risk (Android WebView/Chrome viewport and keyboard behavior differs from iOS and can regress with the same CSS/layout changes).

## What Changes

- Harden mobile app-shell bottom navigation bounds for both iOS and Android viewport/safe-area behaviors.
- Standardize modal mobile shape/containment so rounded corners and clipping are deterministic across dialog variants.
- Stabilize date/month picker interaction so hidden-input focus/text-selection artifacts do not occur in modal forms.
- Expand validation criteria to explicitly include Android browser and WebView behavior alongside iOS.

## Capabilities

### Modified Capabilities
- `frontend-routing-ui-foundation`
- `frontend-modal-a11y-foundation`
- `frontend-mobile-date-field-stability`
- `frontend-mobile-keyboard-stability`

## Impact

- Affected frontend code (expected):
  - `frontend/src/routes/AppShell.tsx`
  - `frontend/src/components/ModalForm.tsx`
  - `frontend/src/ui/dialog.tsx`
  - `frontend/src/ui/alert-dialog.tsx`
  - `frontend/src/components/DatePickerField.tsx`
  - `frontend/src/index.css`
- Test impact:
  - Update/add route shell, modal, and date-field interaction tests for iOS + Android-safe behavior.
- API/OpenAPI impact:
  - None.
- Backwards compatibility:
  - Frontend-only UX hardening; no backend contract changes.
