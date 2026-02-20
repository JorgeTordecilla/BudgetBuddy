## Summary

This change is contract-hardening only. Runtime already supports optional cookie domain configuration via `REFRESH_COOKIE_DOMAIN`; the missing piece is explicit contract language.

## Current Runtime Behavior

- `REFRESH_COOKIE_DOMAIN` defaults to empty -> `None`.
- `set_refresh_cookie` and `clear_refresh_cookie` pass `domain=settings.refresh_cookie_domain`.
- When `domain` is `None`, the emitted cookie is host-only.

## Design Decision

Document two valid contract modes for `bb_refresh`:

1. Default mode (recommended): no `Domain` attribute in `Set-Cookie` (host-only).
2. Optional mode: include `Domain=<configured_domain>` when `REFRESH_COOKIE_DOMAIN` is set.

This keeps behavior backward-compatible while clarifying production topology tradeoffs.
