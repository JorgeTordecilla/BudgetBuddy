## 1. Error Domain and Mapping Foundation

- [x] 1.1 Create `frontend/src/api/errors.ts` with normalized error types (`ApiProblemError`, `ApiUnknownError`, `ApiNetworkError`) and parser helpers.
- [x] 1.2 Capture `X-Request-Id`, `httpStatus`, and optional `Retry-After` in normalized errors.
- [x] 1.3 Create `frontend/src/api/problemMapping.ts` with canonical type-to-UX mapping (`message`, `presentation`).
- [x] 1.4 Add safe fallback behavior for unknown types (no raw sensitive detail by default).

## 2. Shared Error UI Components

- [x] 2.1 Create `frontend/src/components/errors/ProblemDetailsInline.tsx` with retry affordance support.
- [x] 2.2 Create `frontend/src/components/errors/ProblemDetailsToast.tsx` for global toast rendering.
- [x] 2.3 Create `frontend/src/utils/clipboard.ts` copy utility with deterministic success/failure feedback.
- [x] 2.4 Add request-id rendering + copy action in inline and toast components.

## 3. API Client and Query Integration

- [x] 3.1 Integrate normalized parser path into shared API client error flow.
- [x] 3.2 Add global QueryClient error policy (`query inline-first`, `mutation toast-first`, mapping override support).
- [x] 3.3 Prevent duplicate toasts when local handlers already render error context.
- [x] 3.4 Preserve existing auth/session behaviors (401 refresh and redirect policy) while adopting shared errors.

## 4. Route Adoption Sweep

- [x] 4.1 Migrate transactions pages to shared error model/components (list, forms, import/export flows).
- [x] 4.2 Migrate budgets pages to shared error model/components.
- [x] 4.3 Migrate analytics pages to shared error model/components.
- [x] 4.4 Ensure each adopted page shows request id in rendered errors when available.

## 5. Tests

- [x] 5.1 Add unit tests for `toApiError` normalization (ProblemDetails, unknown HTTP, network failures).
- [x] 5.2 Add unit tests for `problemMapping` known/unknown type behavior.
- [x] 5.3 Add component tests for inline error request-id + copy + retry interactions.
- [x] 5.4 Add component tests for toast request-id + copy behavior.
- [x] 5.5 Add integration-level tests for React Query global error presentation policy.

## 6. Verification

- [x] 6.1 Run `npm run test` in `frontend`.
- [x] 6.2 Run `npm run test:coverage` in `frontend` and keep coverage at or above configured frontend thresholds.
- [x] 6.3 Run `npm run build` in `frontend`.
- [x] 6.4 Manual smoke: trigger representative 401/403/406/409/429 flows and confirm deterministic UX + request-id copyability.
