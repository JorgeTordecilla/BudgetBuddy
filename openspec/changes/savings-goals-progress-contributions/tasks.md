## 1. Backend Data Model and Migration

- [x] 1.1 Create Alembic migration `20260304_0008_add_savings_goals.py` for `savings_goals` and `savings_contributions` tables.
- [x] 1.2 Add DB constraints: `target_cents > 0`, `amount_cents > 0`, `status enum(active/completed/cancelled)`.
- [x] 1.3 Add FK constraints to `users`, `accounts`, `categories`, `transactions` with cascade policies.
- [x] 1.4 Add index `(goal_id, contributed_at)` for contribution history reads.
- [ ] 1.5 Verify migration upgrade/downgrade on clean and existing DB paths.

## 2. Backend Models, Schemas, and Errors

- [x] 2.1 Add SQLAlchemy models `SavingsGoal` and `SavingsContribution` in `app/models.py`.
- [x] 2.2 Add Pydantic schemas: create/update/out/detail/summary for goals and contributions.
- [x] 2.3 Add canonical error constants/helpers in `app/errors.py` for 6 savings problem types.
- [x] 2.4 Ensure response schemas include computed fields (`saved_cents`, `remaining_cents`, `progress_pct`).

## 3. Backend Savings Router

- [x] 3.1 Create `app/routers/savings.py` with CRUD endpoints for `/savings-goals` and `/savings-goals/{goal_id}`.
- [x] 3.2 Implement list semantics with `status` filter (`active|completed|cancelled|all`) and default `active` only.
- [x] 3.3 Implement ownership and category/account validation with canonical `403/409` mapping.
- [x] 3.4 Implement deadline-in-past validation with canonical `422`.
- [x] 3.5 Implement PATCH rules for `target_cents`, including auto-complete when `saved_cents >= new_target` (SG-B-09b).

## 4. Status Actions and Contribution Lifecycle

- [x] 4.1 Implement `POST /savings-goals/{goal_id}/complete` with idempotent behavior and cancelled conflict rule.
- [x] 4.2 Implement `POST /savings-goals/{goal_id}/cancel` with idempotent behavior and completed conflict rule.
- [x] 4.3 Implement `POST /savings-goals/{goal_id}/contributions` with `amount_cents > 0` validation and canonical errors.
- [x] 4.4 Ensure contribution creation atomically creates linked `Transaction` (`type=expense`, goal account/category, merchant/note pattern).
- [x] 4.5 Auto-complete goal when contribution makes `saved_cents >= target_cents`.
- [x] 4.6 Implement `DELETE /savings-goals/{goal_id}/contributions/{contribution_id}` to delete contribution + linked transaction.
- [x] 4.7 Return `404` when deleting a non-existent contribution id (non-idempotent delete).
- [x] 4.8 Recalculate status to `active` when delete drops a previously auto-completed goal below target.
- [x] 4.9 Implement `GET /savings-goals/{goal_id}` with computed metrics and latest 10 contributions.
- [x] 4.10 Implement `GET /savings-goals/summary` aggregate response.

## 5. Contract and App Wiring

- [x] 5.1 Register `savings_router` in `app/main.py`.
- [x] 5.2 Update `backend/openapi.yaml` with savings paths, schemas, and response examples.
- [x] 5.3 Add 6 canonical savings errors to OpenAPI problem catalog + examples.
- [x] 5.4 Sync `openspec/specs/openapi.yaml` mirror.

## 6. Frontend API Layer and Queries

- [x] 6.1 Add savings types to `src/api/types.ts`.
- [x] 6.2 Add `src/api/savings.ts` wrappers for list/get/create/patch/archive/complete/cancel/contribution/summary.
- [x] 6.3 Add `src/api/savings.test.ts` wrapper tests.
- [x] 6.4 Add 6 savings canonical problem types in `problemTypes.ts` and mapping entries in `problemMapping.ts`.
- [x] 6.5 Add savings query keys/hooks and invalidation strategy in `analyticsQueries.ts` (including summary hook).

## 7. Frontend Savings UI

- [x] 7.1 Add route `/app/savings` and AppShell nav link.
- [x] 7.2 Implement `SavingsPage.tsx` with summary KPIs, status filter, goal list, and zero-state CTA.
- [x] 7.3 Implement `SavingsProgressBar` and `SavingsStatusBadge` (local deadline rules for due soon/overdue).
- [x] 7.4 Implement `SavingsGoalForm` modal (create/edit) with inline target/deadline validations.
- [x] 7.5 Implement `SavingsGoalDetail` with computed values and recent contributions list.
- [x] 7.6 Implement `SavingsContributionModal` and add-contribution workflow.
- [x] 7.7 Implement complete/cancel actions and contribution deletion flows with deterministic UI refresh.
- [x] 7.8 Ensure responsive behavior without horizontal overflow in mobile layouts.

## 8. Test Coverage

- [x] 8.1 Add backend integration tests for SG-B-01..SG-B-21 in `backend/tests/test_api_integration.py`.
- [x] 8.2 Add backend OpenAPI contract tests for savings paths/schemas/problem mappings.
- [x] 8.3 Add frontend page/component tests for SG-F-01..SG-F-15 in `SavingsPage.test.tsx` and component tests.
- [x] 8.4 Add tests for complete/cancel idempotency and contribution delete `404` behavior.

## 9. Verification and Quality Gates

- [ ] 9.1 Run backend tests: `cd backend && source .venv/bin/activate && python -m pytest`.
- [x] 9.2 Run frontend tests: `cd frontend && npm run test`.
- [x] 9.3 Run frontend coverage: `cd frontend && npm run test:coverage`.
- [x] 9.4 Run frontend build: `cd frontend && npm run build`.
- [ ] 9.5 Validate UX semantics manually (status badges, progress recalculation, complete/cancel/contribution transitions).
