## MODIFIED Requirements

### Requirement: Session lifecycle, refresh retry, and route-guard behavior must be deterministic
Frontend production session behavior MUST remain predictable under cross-site cookie constraints, with explicit operator-facing guidance for configuration and validation.

#### Scenario: Cross-site production compatibility checklist is explicit
- **WHEN** frontend production rollout is prepared
- **THEN** deployment/release documentation SHALL require validation of cookie-based refresh from hosted frontend origin
- **AND** checklist SHALL include `credentials: include`, origin allowlist, and cookie attribute expectations.

#### Scenario: Production auth compatibility is verified before release promotion
- **WHEN** release validation is executed
- **THEN** checklist SHALL verify login sets refresh cookie and refresh rotation succeeds from hosted frontend
- **AND** auth compatibility failures SHALL block release promotion.
