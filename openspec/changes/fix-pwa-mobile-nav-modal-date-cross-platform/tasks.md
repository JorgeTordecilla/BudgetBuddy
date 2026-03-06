## 1. Mobile App Shell Boundaries

- [x] 1.1 Update bottom navigation layout contract in `AppShell` to prevent viewport overflow in iOS and Android.
- [x] 1.2 Add/adjust shell-level spacing rules so fixed bottom nav and FAB stack do not clip or exceed safe-area bounds.

## 2. Modal Geometry Hardening

- [x] 2.1 Enforce rounded mobile dialog geometry in shared `Dialog`/`AlertDialog` primitives.
- [x] 2.2 Verify `ModalForm` and `ConfirmDialog` keep clipping, scrolling, and action visibility with keyboard open/close.

## 3. Date/Month Interaction Stability

- [x] 3.1 Refine `DatePickerField` internals to avoid hidden-input focus and text selection artifacts.
- [x] 3.2 Confirm date/month fields in Transactions and Budgets modals do not trigger ghost keyboard focus.

## 4. Cross-Platform Regression Coverage

- [x] 4.1 Add/update tests for mobile shell bounds, modal rounded containment, and date picker interaction stability.
- [x] 4.2 Run frontend `test` and `build` and record cross-platform manual verification notes for iOS and Android.

## Manual Verification Notes

- iOS Safari/Chrome/Brave: issue reproduction previously provided by user; fixes implemented and awaiting user re-check on device.
- Android Chrome/Brave/WebView: implementation included safe-area/visual-viewport hardening paths and regression tests; physical device confirmation still recommended before archive.
- Automated verification: `npm.cmd run test` and `npm.cmd run build` passed on 2026-03-06.
