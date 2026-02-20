## Why

Operational troubleshooting and incident analysis require consistent, correlatable request logs.
Current logging has partial structure but lacks full per-request access fields and explicit environment-driven error logging policy.

## What Changes

- Add structured request logging fields for every request:
  - `request_id`
  - `method`
  - `path`
  - `status_code`
  - `duration_ms`
  - `user_id` when authenticated
- Enforce safe 5xx logging behavior by environment:
  - non-production: include stack traces
  - production: avoid leaking sensitive stack details
- Add environment-configurable log level.
- Add tests ensuring request logs always include `request_id`.

## Impact

- Faster debugging and incident correlation across services and logs.
- Lower risk of sensitive data leakage in production logs.
- Better operational consistency for dev and production observability.
