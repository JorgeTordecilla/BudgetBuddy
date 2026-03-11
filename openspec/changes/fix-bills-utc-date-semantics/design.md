## Context

The bills router still uses `date.today()` in two places: when generating the transaction for a bill payment, and when determining whether a bill in the current month is overdue. The backend otherwise relies on `utcnow()` helpers for time-sensitive behavior, so these two paths remain inconsistent and can drift at timezone boundaries.

## Goals / Non-Goals

**Goals:**
- Align bill payment transaction dates with UTC-derived current date semantics.
- Align monthly overdue determination with UTC-derived current date semantics.
- Keep tests deterministic by patching `utcnow()` rather than patching `date.today()`.

**Non-Goals:**
- No changes to bill schemas, response shapes, or status vocabulary.
- No changes to payment persistence model or monthly-status aggregation rules beyond date source.
- No changes to overdue semantics outside the current-month rule already in place.

## Decisions

### D1. Bill payment transaction dates use UTC-derived current date
`POST /bills/{bill_id}/payments` will use `utcnow().date()` for the generated transaction date.

Rationale:
- aligns with the backend's UTC-oriented date handling;
- avoids server-local timezone drift.

### D2. Overdue determination uses UTC-derived current date
`GET /bills/monthly-status` will use `utcnow().date()` when evaluating current-month overdue state.

Rationale:
- avoids incorrect `pending` vs `overdue` classification around midnight in non-UTC deployments.

### D3. Tests patch `utcnow()`
Bill UTC correctness tests will monkeypatch `utcnow()` in `bills.py` instead of replacing `date.today()`.

Rationale:
- keeps tests aligned with the implementation abstraction;
- makes timezone-sensitive behavior deterministic without faking the `date` type.

## Risks / Trade-offs

- [Boundary-sensitive behavior changes] -> cover with deterministic UTC-based tests.
- [Minimal code change may look redundant] -> keep tests explicit so the reason stays visible.
