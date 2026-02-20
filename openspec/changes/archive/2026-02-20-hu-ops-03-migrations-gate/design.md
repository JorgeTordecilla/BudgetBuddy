## Summary

Add migration-state verification to readiness checks with environment-configurable strictness.

## Runtime Behavior

`GET /readyz` evaluates:

1. Database connectivity (`db` check).
2. Alembic revision state (`schema` check).

### Strictness

- `MIGRATIONS_STRICT=true`:
  - readiness fails (`503`) when current DB revision is not at Alembic head.
- `MIGRATIONS_STRICT=false`:
  - readiness is controlled by DB connectivity only.
  - schema mismatch is reported but does not force `503`.

Recommended default:
- `true` in production
- `false` in local/dev/test unless explicitly enabled

## Readiness Payload

Keep payload deterministic and machine-friendly:

- success example:
  - `status=ready`
  - `checks.db=ok`
  - `checks.schema=ok|skip`
- failure example:
  - `status=not_ready`
  - `checks.db=fail|ok`
  - `checks.schema=fail|unknown`

## Observability

Emit explicit operational fields when schema check runs:

- `db_revision`
- `head_revision`
- `migrations_strict`

Do not log secrets or connection credentials.

## Diagnostic Contract

Deployment docs must define:

- baseline deploy command: `alembic upgrade head`
- mismatch diagnosis flow (e.g., `alembic current`, `alembic heads`)

## Failure Tolerance

If revision data cannot be read (missing alembic table, migration config issues):

- strict mode -> readiness fails with schema check status indicating failure/unknown
- non-strict mode -> readiness remains DB-driven, schema check can report `skip` or `unknown`
