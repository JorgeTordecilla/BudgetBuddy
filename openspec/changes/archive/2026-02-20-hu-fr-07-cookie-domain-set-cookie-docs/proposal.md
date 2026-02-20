## Why

Cross-site production setups can fail due to cookie domain scope confusion (`host-only` vs shared-subdomain cookies). The current OpenAPI descriptions for auth refresh cookies do not clarify whether `Domain` is set or omitted by default.

## What Changes

- Document refresh cookie `Domain` behavior in OpenAPI response header descriptions.
- Explicitly state that default behavior omits `Domain` (host-only cookie).
- Document optional shared-subdomain behavior when `REFRESH_COOKIE_DOMAIN` is configured.
- Add contract assertions so this wording does not drift.

## Capabilities

### Modified Capabilities
- `api-http-contract`: auth `Set-Cookie` semantics explicitly describe `Domain` policy.

## Impact

- `backend/openapi.yaml`
- `openspec/specs/openapi.yaml`
- `openspec/specs/api-http-contract/spec.md`
- `openspec/specs/auth-session-management/spec.md`
- `backend/tests/test_contract_openapi.py`
