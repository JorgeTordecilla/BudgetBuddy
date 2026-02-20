## Summary

Introduce a minimal access-log layer with consistent structured fields and environment-safe error logging behavior.

## Access Log Fields

Log one access record per HTTP request including:

- `request_id`
- `method`
- `path`
- `status_code`
- `duration_ms`
- `user_id` (only when authenticated, otherwise a neutral placeholder such as `anonymous`)

Format can remain key=value (existing style) for compatibility.

## Request Lifecycle Integration

Use middleware timing around request handling:

1. capture start time
2. process request
3. capture response status
4. emit structured access log

This should include both success and error responses.

## User Correlation

When authentication resolves a user, runtime should attach user identity to request state for logging correlation.
Do not log additional PII beyond stable user identifier.

## Error Logging Policy

For unhandled 5xx paths:

- non-production: include stacktrace (`exc_info`) for debugging
- production: suppress verbose stacktrace by default, keep structured error metadata

Secret-bearing values must remain redacted/sanitized in both environments.

## Configurability

Add log-level setting via environment variable (for example `LOG_LEVEL`), with safe defaults per environment.

## Testing

Add tests proving:

- request logs always include `request_id`
- access log structure includes required fields
- stacktrace policy toggles by environment mode
