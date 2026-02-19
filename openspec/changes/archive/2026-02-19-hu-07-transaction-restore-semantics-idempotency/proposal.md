## Why

Transactions currently support archive via `DELETE /transactions/{transaction_id}`, but restore semantics are not explicit. Categories already have restore behavior (`archived_at: null`), so transactions should be symmetric.

## What Changes

- Define restore semantics for transactions through `PATCH /transactions/{transaction_id}` with `archived_at: null`.
- Enforce idempotent restore behavior:
  - If archived -> restore and return `200`.
  - If already active -> still return `200` with unchanged active state.
- Keep canonical auth/media behavior:
  - `401` unauthorized
  - `403` forbidden (non-owner)
  - `406` unacceptable `Accept`
  - errors as `application/problem+json`
  - success as `application/vnd.budgetbuddy.v1+json`

## Scope

- Runtime behavior in transactions patch flow.
- Contract alignment in OpenAPI files.
- Integration test matrix:
  - happy restore
  - idempotent restore
  - forbidden non-owner restore
  - unsupported accept on restore

## Impact

- Improves consistency of archive/restore semantics across domain resources.
- Reduces client ambiguity and simplifies UI restore flows.
