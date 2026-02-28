# Mobile-First UI Refresh Checklist

## Design Tokens

- Typography:
  - Display: `Fraunces` (headings and KPI hierarchy)
  - Body/UI: `Manrope` (forms, tables, labels)
- Color:
  - Warm neutral surfaces for base/background
  - Deep ink foreground for text contrast
  - Teal primary accent and muted copper secondary emphasis
- Shape:
  - Base radius token `--radius: 1rem`
  - Soft borders and subtle shadows for layered surfaces
- Motion:
  - `rise-in` entry animation for section-level reveal
  - Respect `prefers-reduced-motion` (no critical reliance on animation)

## Responsive QA

- Mobile (`360x800`, `390x844`):
  - Bottom navigation visible and route switching works
  - Transactions/Accounts/Categories/Budgets render list cards (no horizontal dependency)
  - Floating `New transaction` action appears only on dashboard/transactions context
- Tablet (`768x1024`):
  - Filters and actions wrap cleanly
  - Header hierarchy remains readable
- Desktop (`1280x800`):
  - Dense tables remain available and aligned
  - Navigation remains keyboard accessible

## Accessibility and States

- Focus ring visible on controls and links
- Checkbox and button targets are touch-friendly
- Loading, empty, and error states verified for:
  - Transactions
  - Accounts
  - Categories
  - Budgets
  - Analytics
