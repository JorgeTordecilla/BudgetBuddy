## 1. Savings UTC Correctness

- [x] 1.1 Replace `date.today()` with `utcnow().date()` in `_validate_deadline_or_422` in `backend/app/routers/savings.py`.
- [x] 1.2 Replace `date.today()` with `utcnow().date()` for the internal contribution transaction date in `backend/app/routers/savings.py`.

## 2. Rollover Authorization Semantics

- [x] 2.1 Update `_owned_active_account_or_conflict` in `backend/app/routers/rollover.py` so foreign account references return canonical `403`.
- [x] 2.2 Update `_owned_active_income_category_or_conflict` in `backend/app/routers/rollover.py` so foreign category references return canonical `403`.
- [x] 2.3 Preserve `409` behavior for archived owned rollover account/category resources.

## 3. Rollover Maintainability And Cleanup

- [x] 3.1 Add a docstring to `_normalize_rollover_source` in `backend/app/routers/rollover.py` documenting that it mutates a session-bound object and requires caller commit.
- [x] 3.2 Add the missing blank line between `SUPPORTED_CURRENCIES` and `validate_user_currency_for_money` in `backend/app/core/money.py`.

## 4. Tests And Spec Alignment

- [x] 4.1 Add or update integration coverage for rollover foreign account/category returning `403`.
- [x] 4.2 Add or update integration coverage for rollover archived owned account/category returning `409`.
- [x] 4.3 Add or update regression coverage for savings UTC-based deadline and contribution-date behavior.

## 5. Verification

- [x] 5.1 Run targeted rollover and savings tests from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest tests/test_api_integration.py -k "rollover or savings"`
- [x] 5.2 Run full backend regression suite from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest`
