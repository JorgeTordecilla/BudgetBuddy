## 1. Contract and API layer

- [x] 1.1 Add transaction types in `frontend/src/api/types.ts` (`Transaction`, `TransactionsListResponse`, `TransactionCreate`, `TransactionUpdate`).
- [x] 1.2 Create `frontend/src/api/transactions.ts` with `listTransactions`, `createTransaction`, `updateTransaction`, `archiveTransaction`, `restoreTransaction`.
- [x] 1.3 Ensure request behavior is contract-strict (`Accept`, vendor `Content-Type` when body exists, `credentials: include`, ProblemDetails parsing).

## 2. Routing and page scaffolding

- [x] 2.1 Add `/app/transactions` route in `frontend/src/main.tsx`.
- [x] 2.2 Add transactions navigation entry in `frontend/src/routes/AppShell.tsx`.
- [x] 2.3 Create `frontend/src/pages/TransactionsPage.tsx` with loading/empty/success/error states.

## 3. Transaction UI flows

- [x] 3.1 Add reusable transaction form component for create/edit payloads.
- [x] 3.2 Implement create flow (POST) with mutation and list invalidation.
- [x] 3.3 Implement edit flow (PATCH) with partial payload support.
- [x] 3.4 Implement restore flow with `PATCH { archived_at: null }` for archived rows.
- [x] 3.5 Implement archive flow with confirm dialog + `DELETE` + list refresh.
- [x] 3.6 Implement cursor pagination "Load more" without duplicate rows.

## 4. Error handling

- [x] 4.1 Add centralized ProblemDetails-to-message mapping for transaction flows.
- [x] 4.2 Ensure `409 category-type-mismatch` surfaces a specific UX message.
- [x] 4.3 Ensure `400/403/406` show deterministic, readable feedback.
- [x] 4.4 Ensure `401` follows existing refresh/login redirect behavior.

## 5. Tests and quality gates

- [x] 5.1 Add unit tests for transactions API wrappers.
- [x] 5.2 Add unit tests for ProblemDetails message mapping.
- [x] 5.3 Add component/integration tests for edit/restore/archive flow.
- [x] 5.4 Run `npm run test` in `frontend/`.
- [x] 5.5 Run `npm run test:coverage` in `frontend/`.
- [x] 5.6 Run `npm run build` in `frontend/`.
- [x] 5.7 Verify coverage >= 85% global and >= 90% on critical transaction flows.
