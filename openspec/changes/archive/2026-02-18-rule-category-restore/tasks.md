## 1. Restore Rule Implementation

- [x] 1.1 Update category patch flow to treat `archived_at: null` as restore and persist `archived_at` cleared for owner categories
- [x] 1.2 Ensure restore path returns `200` with `Category` payload and vendor media type `application/vnd.budgetbuddy.v1+json`
- [x] 1.3 Keep restore behavior idempotent when category is already active (`archived_at` already null)

## 2. Authorization and Contract Enforcement

- [x] 2.1 Ensure `PATCH /categories/{category_id}` without access token returns `401` ProblemDetails
- [x] 2.2 Ensure restoring another user's category returns `403` ProblemDetails following current ownership policy
- [x] 2.3 Ensure unsupported `Accept` on restore request returns `406` with `application/problem+json`

## 3. Test Matrix

- [x] 3.1 Add integration happy-path test: create category -> archive via delete -> patch `archived_at:null` -> assert `200` and `archived_at:null`
- [x] 3.2 Add integration auth test: patch restore without token -> assert `401`
- [x] 3.3 Add integration ownership test: patch other user's category -> assert `403` (document current policy)
- [x] 3.4 Add integration contract test: wrong `Accept` header on restore -> assert `406` ProblemDetails

## 4. Verification

- [x] 4.1 From `backend` with `.venv` activated, run: `py -m pytest tests -q -s --cov=app --cov-report=term-missing:skip-covered`
- [x] 4.2 Confirm tests pass and overall coverage remains `>= 90%`
