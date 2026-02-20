## Why

Critical configuration errors should fail fast at startup instead of allowing the service to run in an insecure or broken state.

## What Changes

- Add strict startup validation for critical environment settings.
- Enforce production-safe constraints (no insecure debug/cookie/CORS combinations).
- Ensure startup logs confirm loaded configuration without leaking secrets.
- Add unit tests for configuration validation behavior.
- Document required variables and fail-fast behavior in `DEPLOYMENT.md`.

## Capabilities

### Added Capabilities
- `runtime-configuration`: startup configuration validation and security guardrails.

## Impact

- `backend/app/core/config.py`
- startup wiring (`backend/app/main.py` if needed for startup log behavior)
- config unit tests
- `DEPLOYMENT.md`
