## Why

`POST /auth/refresh` currently issues new tokens, but without strict rotation and reuse detection a leaked refresh token can be replayed. This is a session security gap.

HU-04 defines refresh-token rotation with replay protection and deterministic error semantics.

## What Changes

- Implement one-time refresh token rotation on every successful refresh.
- Invalidate the previous refresh token immediately after rotation.
- Detect and reject replay/revoked refresh tokens with canonical `403` ProblemDetails.
- Keep malformed/expired/signature-invalid refresh tokens as canonical `401`.
- Ensure logout revokes active refresh token(s).
- Persist refresh state with hashed token storage and O(1)-style lookup path.

## API Contract

- `POST /auth/refresh`:
  - Success: `200` with new `access_token` + new `refresh_token`.
  - Old refresh token becomes invalid immediately.
  - `401`: invalid/expired/malformed/signature-invalid refresh token.
  - `403`: revoked refresh token or detected reuse.

Canonical 403 ProblemDetails:
- `type=https://api.budgetbuddy.dev/problems/refresh-revoked`
- `title=Refresh token revoked` (or `Refresh token reuse detected`)
- `status=403`

## Impact

- Runtime auth service/token persistence.
- New canonical error helper(s) in `backend/app/errors.py`.
- Integration tests for refresh replay and logout revocation behavior.
- OpenAPI and OpenSpec contract alignment for refresh responses.
