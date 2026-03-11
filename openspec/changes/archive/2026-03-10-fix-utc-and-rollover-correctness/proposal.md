## Why

Several backend paths still contain correctness mismatches or undocumented behavior that should be resolved before they turn into contract drift or maintenance traps. Savings still depends on `date.today()` instead of UTC-aligned time handling, rollover still returns `409` for foreign resources where `403` is semantically correct, and rollover source normalization still mutates a session-bound object without documenting that contract.

## What Changes

- Replace `date.today()` with `utcnow().date()` in savings deadline validation and in the internal contribution transaction date.
- Split rollover account/category validation so foreign resources return canonical `403 Forbidden`, while archived owned resources continue returning `409 Conflict`.
- Document `_normalize_rollover_source` as a helper that mutates a session-bound SQLAlchemy object and relies on caller commit.
- Add the missing module-level blank line in `backend/app/core/money.py`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `savings-goals-management`: clarify that savings deadline validation and contribution-side transaction dates use UTC-derived current date semantics.
- `backend-rollover-management`: correct rollover ownership semantics for foreign vs archived resources and document rollover source normalization contract expectations.
- `api-http-contract`: reflect canonical `403` for rollover ownership violations while preserving `409` for archived owned resources.

## Impact

- Runtime code:
  - `backend/app/routers/savings.py`
  - `backend/app/routers/rollover.py`
  - `backend/app/core/money.py`
- Tests:
  - savings UTC behavior
  - rollover ownership semantics
- API/OpenSpec contract:
  - rollover apply error semantics are observably corrected from `409` to `403` for foreign resources
  - success payloads and media types remain unchanged
