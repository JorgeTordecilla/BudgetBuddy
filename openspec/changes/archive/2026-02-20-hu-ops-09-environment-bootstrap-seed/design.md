## Summary

Introduce a deterministic bootstrap workflow for non-production environments.
The workflow executes migrations first, then optional demo-data seeding with idempotent behavior.

## Entry Point

- Add a single command entry point (CLI/script), for example:
  - `python -m app.cli.bootstrap`

## Workflow

1. Validate runtime guardrails (environment + flags).
2. Execute `alembic upgrade head`.
3. Optionally create demo user.
4. Optionally seed minimal domain data:
   - one account
   - baseline categories (e.g., one income, one expense)
5. Print concise completion summary.

## Configuration

Suggested environment flags:

- `BOOTSTRAP_CREATE_DEMO_USER` (bool)
- `BOOTSTRAP_DEMO_USERNAME`
- `BOOTSTRAP_DEMO_PASSWORD`
- `BOOTSTRAP_SEED_MINIMAL_DATA` (bool)
- `BOOTSTRAP_ALLOW_PROD` (bool, default false)

## Safety and Idempotency

- In production:
  - default behavior rejects bootstrap execution
  - explicit `BOOTSTRAP_ALLOW_PROD=true` required to proceed
- Repeated runs must not create uncontrolled duplicates.
- Logs/output must not expose secrets (passwords/tokens).

## Testing Strategy

- Verify bootstrap works in non-production and creates expected baseline entities.
- Verify re-run idempotency behavior.
- Verify production guardrail blocks execution by default.
- Verify no secret leakage in command output/logging.
