## 1. Bills UTC Correctness

- [x] 1.1 Replace `date.today()` with `utcnow().date()` for the generated transaction date in `backend/app/routers/bills.py`.
- [x] 1.2 Replace `date.today()` with `utcnow().date()` in monthly overdue determination in `backend/app/routers/bills.py`.

## 2. Test Coverage

- [x] 2.1 Update monthly overdue tests to patch `utcnow()` in `backend/app/routers/bills.py`.
- [x] 2.2 Add or update coverage proving bill payment generated transactions use the UTC-derived current date.

## 3. Verification

- [x] 3.1 Run targeted bills tests from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest tests/test_api_integration.py -k "bills"`
- [x] 3.2 Run full backend regression suite from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest`
