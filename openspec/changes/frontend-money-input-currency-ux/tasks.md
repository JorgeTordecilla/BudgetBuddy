## 1. Shared Money UX Foundation

- [x] 1.1 Add/extend shared frontend money helpers to parse major-unit input into integer cents using user `currency_code` for base currencies (`USD`, `COP`, `EUR`, `MXN`).
- [x] 1.2 Keep shared formatter usage centralized for cents-to-display conversion and remove raw-cents primary rendering from target screens.
- [x] 1.3 Add unit tests for money parsing/formatting edge cases (valid values, invalid values, precision/rounding boundaries).

## 2. Transactions and Income Sources UX

- [x] 2.1 Update transaction create/edit form labels, placeholders, and validation to accept major-unit user input while sending `amount_cents`.
- [x] 2.2 Update transaction list/card amount rendering to use formatted currency display instead of raw cents.
- [x] 2.3 Update income sources create/edit form to accept major-unit expected amount input and convert to `expected_amount_cents` for API calls.
- [x] 2.4 Update income sources list/details money rendering to show formatted currency values using session `currency_code`.
- [x] 2.5 Add/adjust page/component tests for transaction and income source flows to assert major-unit UX + integer-cents payload contract.

## 3. Analytics and Dashboard Currency Consistency

- [x] 3.1 Ensure analytics expected/actual/monthly values are consistently formatted from cents using user `currency_code`.
- [x] 3.2 Verify dashboard and analytics shared money display paths use the same formatting helpers and scale rules.
- [x] 3.3 Add/adjust analytics/dashboard tests to assert scale correctness for large values (for example `4,000,000` major units) and no 100x drift.

## 4. Verification and Quality Gates

- [x] 4.1 Run frontend unit tests for money helpers and updated components/pages.
- [x] 4.2 Run frontend integration-focused tests for transactions, income sources, and analytics routes.
- [x] 4.3 Run frontend smoke/route tests for authenticated navigation flows impacted by money display updates.
- [x] 4.4 Run full frontend verification commands: `cd frontend && npm run test && npm run test:coverage && npm run build`.
- [x] 4.5 Confirm no backend contract changes were introduced (API payload fields remain integer cents).
