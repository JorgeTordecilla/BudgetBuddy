## Why

Development and QA environments should not depend on implicit or "magic" database state.
Teams need a deterministic bootstrap command to prepare a clean environment quickly.

## What Changes

- Add an environment bootstrap command that can:
  - run database migrations
  - optionally create a demo user
  - optionally seed minimal domain data (account + categories)
- Enforce production safety:
  - bootstrap/seed behavior disabled by default in production
  - explicit opt-in required to allow production execution
- Document bootstrap command and environment flags.

## Impact

- Faster, more reliable onboarding for dev and QA.
- Reduced environment drift and flaky manual setup.
- Safer defaults for production operations.
