## Why

The bills backend still contains two server-local date calculations that are inconsistent with the backend's UTC-oriented time handling. Bill payment transaction creation and monthly overdue status currently depend on `date.today()`, which can produce incorrect results around midnight when the server timezone is not UTC.

## What Changes

- Replace `date.today()` with `utcnow().date()` when creating the generated transaction in `POST /bills/{bill_id}/payments`.
- Replace `date.today()` with `utcnow().date()` in `GET /bills/monthly-status` overdue determination logic.
- Update tests so bill overdue semantics and generated payment transaction dates are verified against deterministic UTC-based time.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `bills-recurring-management`: clarify that bill payment transaction dates and overdue calculations use the current UTC-derived date.

## Impact

- Runtime code:
  - `backend/app/routers/bills.py`
- Tests:
  - bill payment transaction date coverage
  - monthly overdue status coverage
- Contract:
  - no success payload changes
  - no status-code changes
  - correctness-only behavior adjustment at UTC timezone boundaries
