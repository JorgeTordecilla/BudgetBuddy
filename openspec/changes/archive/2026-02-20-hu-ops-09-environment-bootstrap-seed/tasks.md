## 1. Bootstrap command

- [x] 1.1 Add a single bootstrap CLI/script entrypoint.
- [x] 1.2 Execute migrations as first step of bootstrap.

## 2. Seed behavior

- [x] 2.1 Add optional demo user creation controlled by environment flags.
- [x] 2.2 Add optional minimal data seed (account + categories).
- [x] 2.3 Ensure bootstrap seed behavior is idempotent on repeated runs.

## 3. Production safety

- [x] 3.1 Block bootstrap in production by default.
- [x] 3.2 Allow explicit production override only via dedicated opt-in flag.

## 4. Documentation

- [x] 4.1 Document bootstrap command usage and environment flags.
- [x] 4.2 Document production guardrails and expected behavior.

## 5. Tests

- [x] 5.1 Add test covering non-production bootstrap happy path.
- [x] 5.2 Add test covering idempotent re-run behavior.
- [x] 5.3 Add test covering production guardrail default block.

## 6. Verification

- [x] 6.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 6.2 Validate OpenSpec change artifacts.
