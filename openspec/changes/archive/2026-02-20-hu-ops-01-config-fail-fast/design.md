## Summary

Introduce deterministic fail-fast configuration validation at process startup with explicit production hardening checks.

## Validation Model

Configuration validation runs during settings initialization and raises clear `ValueError` messages when invalid.

Validation classes:

1. **Required values**
   - `DATABASE_URL`
   - `JWT_SECRET`
   - refresh-cookie-related values when cookie auth is enabled
2. **Cross-field coherence**
   - `REFRESH_COOKIE_SAMESITE=None` requires `REFRESH_COOKIE_SECURE=true`
   - production CORS origins must not contain `*`
3. **Environment safety**
   - In production, `DEBUG=true` is rejected
   - In production, insecure cookie flags are rejected

## Logging

Emit a startup "config loaded" event with non-sensitive metadata only (environment, selected feature flags, origin count), never raw secrets.

## Error Clarity

Errors should indicate:
- which variable failed
- which rule failed
- expected safe value/shape

## Compatibility

No API contract changes are expected; this is operational hardening.
