## Context

Current access token format is custom:

```
payload.signature
```

Target format is standard JWT:

```
base64url(header).base64url(payload).base64url(signature)
```

## Decision

Adopt JWT access tokens and enforce JWT-only validation immediately:

1. **Issuance:**
   - Issue JWT access tokens.
2. **Verification:**
   - Accept only JWT `header.payload.signature` format.
   - Reject legacy two-part tokens.

## JWT Requirements

- Signed tokens only.
- Required claims: `sub`, `exp`, `iat`.
- Optional but recommended: `iss`, `aud`, `jti`.
- Algorithm policy must be explicit and fixed server-side (no algorithm confusion).

## Key Management

- Short term: single configured signing key (HS256) is acceptable.
- Recommended evolution: asymmetric signing (RS256/EdDSA) with `kid` support and rotation plan.

## Contract Compatibility

- `Authorization: Bearer` remains unchanged.
- `AuthSessionResponse` shape remains unchanged.
- No refresh-token cookie changes in this HU.

## Risks and Mitigations

- **Risk:** Existing clients using legacy tokens will fail authentication.
  - **Mitigation:** Explicit contract documentation and deterministic canonical `401` responses.
- **Risk:** Claim validation drift across endpoints.
  - **Mitigation:** Centralized decoder and shared auth dependency tests.
