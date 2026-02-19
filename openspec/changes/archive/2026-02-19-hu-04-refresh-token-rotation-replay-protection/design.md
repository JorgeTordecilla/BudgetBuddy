## Context

Refresh tokens are high-value credentials. Reuse after compromise must be blocked deterministically. The API already exposes refresh and logout endpoints; HU-04 hardens token lifecycle semantics.

## Decisions

1. Rotation on every successful refresh
- Any successful `POST /auth/refresh` issues a fresh refresh token and revokes the presented one.

2. Distinct authn vs authz semantics
- `401` for structurally invalid, expired, malformed, or signature-invalid refresh tokens.
- `403` for valid-but-revoked tokens or replay detection (previously rotated token reused).

3. Canonical replay/revoked error
- Add canonical ProblemDetails helper for `refresh-revoked` in `backend/app/errors.py`.
- Reuse same `type/status`; allow title/detail distinction for revoked vs reuse.

4. Token persistence model
- Persist refresh-token state with hashed token identifier (never raw token at rest).
- Keep lookup path indexed by hash (O(1)-style lookup in storage layer).

5. Logout revocation
- Logout must revoke current active refresh token(s) so they cannot be used after logout.

## Risks and Mitigations

- Risk: race on near-simultaneous refresh requests.
  - Mitigation: atomic token state transition (single-use guarantee).
- Risk: false-positive reuse due to inconsistent state persistence.
  - Mitigation: centralized token state checks in auth service.
- Risk: contract drift.
  - Mitigation: update both `backend/openapi.yaml` and `openspec/specs/openapi.yaml`.

## Non-Goals

- No change to access-token format.
- No change to success media type (`application/vnd.budgetbuddy.v1+json`).
