## 1. API Contract Integration

- [x] 1.1 Extend `frontend/src/api/types.ts` with `TransactionImportRequest`, `TransactionImportResult`, and `TransactionImportFailure` types.
- [x] 1.2 Add `importTransactions(client, payload)` to `frontend/src/api/transactions.ts`.
- [x] 1.3 Ensure import API wrapper propagates endpoint-level ProblemDetails via `ApiProblemError`.

## 2. Import Parsing and Validation

- [x] 2.1 Create `frontend/src/features/transactions/import/parseImportInput.ts`.
- [x] 2.2 Support Format A input (`{ mode, items }`) and Format B input (`items[]`).
- [x] 2.3 Enforce basic client-side validations:
- [x] 2.4 valid JSON, non-empty items
- [x] 2.5 required fields (`type`, `account_id`, `category_id`, `amount_cents`, `date`)
- [x] 2.6 `amount_cents` integer > 0, `type` in `income|expense`, date `YYYY-MM-DD`
- [x] 2.7 Add non-blocking payload-size warning threshold.

## 3. Import UI and Routing

- [x] 3.1 Add route `'/app/transactions/import'` in `frontend/src/main.tsx` under authenticated shell.
- [x] 3.2 Add transactions-level import entry in the Transactions page action menu.
- [x] 3.3 Create `frontend/src/features/transactions/import/TransactionsImportPage.tsx` with mode selector + textarea + validate/import actions.
- [x] 3.4 Render deterministic result panel with `created_count`, `failed_count`, and failures table.
- [x] 3.5 Keep request-level ProblemDetails panel distinct from row-level failures.

## 4. Data Refresh and Auth Behavior

- [x] 4.1 On successful import (`200`), invalidate `['transactions']` query family.
- [x] 4.2 On successful import (`200`), invalidate `['analytics']` query family.
- [x] 4.3 Invalidate `['budgets']` where overlay coupling is active in the current UI model.
- [x] 4.4 Verify import flow relies on existing 401 refresh + single retry behavior from shared API client.

## 5. Tests

- [x] 5.1 Add parser unit tests in `frontend/src/features/transactions/import/parseImportInput.test.ts`.
- [x] 5.2 Add component tests for import page validation states and disabled submit behavior.
- [x] 5.3 Add component test for successful import summary + failure row rendering.
- [x] 5.4 Add test coverage for endpoint-level error handling and 401 retry behavior (mocked).

## 6. Verification

- [x] 6.1 Run `npm run test` in `frontend`.
- [x] 6.2 Run `npm run test:coverage` and keep coverage >= 90%.
- [x] 6.3 Run `npm run build` in `frontend`.
- [x] 6.4 Perform manual smoke on `/app/transactions/import` for both modes and mixed valid/invalid rows.
