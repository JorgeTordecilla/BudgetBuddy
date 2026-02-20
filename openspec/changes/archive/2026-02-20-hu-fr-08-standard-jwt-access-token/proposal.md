## Why

Access tokens are currently generated and verified with a custom two-part format (`payload.signature`) instead of a standards-compliant JWT (`header.payload.signature`). While this works internally, it increases long-term security and interoperability risk for enterprise integrations.

## What Changes

- Standardize access tokens to RFC 7519 JWT format.
- Keep `Authorization: Bearer <token>` contract unchanged.
- Reject legacy non-JWT access tokens.
- Document required JWT claims and key-rotation expectations.

## Capabilities

### Modified Capabilities
- `auth-session-management`: access token format and validation strategy.
- `api-http-contract`: bearer token semantics clarified as JWT-compatible.

## Non-Goals

- Changing refresh-token cookie transport.
- Replacing current refresh-token storage model.
- Introducing OAuth/OIDC flows in this change.

## Impact

- `backend/app/core/security.py`
- `backend/app/dependencies.py`
- `backend/openapi.yaml`
- `openspec/specs/auth-session-management/spec.md`
- `openspec/specs/api-http-contract/spec.md`
- auth integration/unit tests for token parsing and legacy-format rejection
