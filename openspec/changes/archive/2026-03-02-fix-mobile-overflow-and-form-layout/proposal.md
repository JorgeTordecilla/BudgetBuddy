## Why

On mobile devices, date inputs and filter fields can overflow their containers, and fixed navigation/FAB layers can obscure actionable content near the bottom of the viewport. This creates usability regressions in core transaction and analytics flows and increases input error risk on small screens.

## What Changes

- Define mobile-first layout requirements so filter and form controls never overflow horizontally in page surfaces or modal dialogs.
- Define viewport-safe spacing requirements for fixed bottom navigation and floating action buttons so scrollable content remains reachable.
- Standardize responsive behavior for date/filter control groups in Transactions and Analytics to preserve tapability and readability at narrow widths.
- Align modal form containers with overflow-safe behavior for mobile keyboards and constrained heights.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `frontend-transactions-management`: Strengthen responsive requirements for transaction filters/forms to prevent horizontal overflow and clipped controls.
- `frontend-analytics-dashboard`: Strengthen responsive requirements for analytics date/filter controls on narrow viewports.
- `frontend-routing-ui-foundation`: Add viewport-safe bottom spacing requirements where fixed mobile navigation and floating actions coexist with page content.
- `frontend-modal-a11y-foundation`: Add mobile overflow/viewport-fit requirements for modal content and action areas.

## Impact

- Affected routes/components:
  - `frontend/src/pages/TransactionsPage.tsx`
  - `frontend/src/features/analytics/AnalyticsPage.tsx`
  - `frontend/src/routes/AppShell.tsx`
  - `frontend/src/components/ModalForm.tsx`
  - `frontend/src/components/transactions/TransactionForm.tsx`
  - `frontend/src/index.css`
- Test impact:
  - UI/unit tests for transactions, analytics, shell layout, and shared CSS assertions.
- API/OpenAPI impact:
  - No changes to `backend/openapi.yaml` paths/components.
  - No media-type changes (`application/vnd.budgetbuddy.v1+json` and `application/problem+json` remain unchanged).
- Backward compatibility:
  - Non-breaking frontend behavior hardening for mobile responsiveness.
