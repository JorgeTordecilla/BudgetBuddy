## 1. API Contract Integration

- [x] 1.1 Extend `frontend/src/api/transactions.ts` with an export query builder for `type`, `account_id`, `category_id`, `from`, `to`.
- [x] 1.2 Add `exportTransactionsCsv(client, params)` API wrapper for `GET /transactions/export`.
- [x] 1.3 Ensure export wrapper sends `Accept: text/csv, application/problem+json`.
- [x] 1.4 Ensure non-200 responses are parsed as `ApiProblemError` with canonical ProblemDetails.

## 2. Transactions Filter Alignment

- [x] 2.1 Extend Transactions page filter state to include optional `from` and `to` (YYYY-MM-DD).
- [x] 2.2 Add `from`/`to` inputs in `frontend/src/pages/TransactionsPage.tsx`.
- [x] 2.3 Ensure list requests keep using the same shared filter source of truth.
- [x] 2.4 Validate local range (`from <= to`) and block export when invalid.

## 3. Download Behavior

- [x] 3.1 Create `frontend/src/utils/download.ts` with blob download helper.
- [x] 3.2 Add filename resolver that prefers `Content-Disposition`, then fallback format.
- [x] 3.3 Trigger CSV download on `200 text/csv` without page navigation.

## 4. UI Wiring

- [x] 4.1 Replace export placeholder in Transactions "More options" menu with active `Export CSV` action.
- [x] 4.2 Add loading state (`Exporting...`) and disable action while request is in flight.
- [x] 4.3 Keep Import action unchanged and preserve existing layout/UX consistency.
- [x] 4.4 Show request-level ProblemDetails on export failures.
- [x] 4.5 On `429`, surface `Retry-After` guidance in user-facing feedback.

## 5. Auth and Retry Semantics

- [x] 5.1 Verify export requests use existing shared API client auth behavior.
- [x] 5.2 Verify `401` refresh + single retry semantics are preserved for export.
- [x] 5.3 Ensure refresh failure continues to follow existing logout/redirect behavior.

## 6. Tests

- [x] 6.1 Add unit tests for export query-string composition.
- [x] 6.2 Add unit tests for filename resolution and fallback behavior.
- [x] 6.3 Add component test for successful export invoking download helper.
- [x] 6.4 Add component test for invalid filter range disabling export.
- [x] 6.5 Add component/API test for `401` refresh + retry once.
- [x] 6.6 Add component/API test for `429` ProblemDetails + `Retry-After` message.

## 7. Verification

- [x] 7.1 Run `npm run test` in `frontend`.
- [x] 7.2 Run `npm run test:coverage` and keep coverage >= 90%.
- [x] 7.3 Run `npm run build` in `frontend`.
- [ ] 7.4 Manual smoke on `/app/transactions`:
- [ ] 7.5 Export with no filters downloads CSV.
- [ ] 7.6 Export with filters (`type/account/category/from/to`) downloads filtered CSV.
- [ ] 7.7 Export with invalid range shows validation or canonical 400 feedback.
- [x] 7.8 Export with simulated `429` shows retry guidance.
