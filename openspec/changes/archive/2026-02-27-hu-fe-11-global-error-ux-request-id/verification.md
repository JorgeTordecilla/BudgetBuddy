# Verification Notes

## Last Verified Run

- Date: 2026-02-27
- Command: `npm run test` (in `frontend`) -> passed (`38` files, `217` tests)
- Command: `npm run test:coverage` (in `frontend`) -> passed
- Coverage snapshot: statements `94.04%`, branches `86.74%`, functions `92.90%`, lines `94.04%`
- Command: `npm run build` (in `frontend`) -> passed

## Automated Checks

- `npm run test` in `frontend` passed.
- `npm run test:coverage` in `frontend` passed with project thresholds configured in `frontend/vitest.config.ts`.
- `npm run build` in `frontend` passed.

## Smoke Coverage Notes (Representative Flows)

- `401` handling validated by auth/client tests and page integration tests.
- `403`/`406`/`409` contract rendering validated through API wrapper and page/component tests.
- `429` handling validated through mapping + toast rendering tests (including `Retry-After` display).
- Request-id rendering/copy behavior validated in inline and toast component tests.

## Supporting Test Files

- `frontend/src/api/errors.test.ts`
- `frontend/src/api/problemMapping.test.ts`
- `frontend/src/components/errors/ProblemDetailsInline.test.tsx`
- `frontend/src/components/errors/ProblemDetailsToast.test.tsx`
- `frontend/src/query/queryClient.test.ts`
