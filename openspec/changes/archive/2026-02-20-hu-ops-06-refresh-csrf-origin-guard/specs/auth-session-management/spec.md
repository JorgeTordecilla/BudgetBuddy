## ADDED Requirements

### Requirement: Refresh endpoint enforces origin-based anti-CSRF control for cross-site cookie flows
When refresh cookies are used in cross-site browser contexts, `POST /auth/refresh` MUST validate request origin before processing token rotation logic.

#### Scenario: Allowed origin can refresh
- **WHEN** `POST /auth/refresh` includes `Origin` that matches configured refresh-origin allowlist
- **THEN** the request SHALL continue normal refresh validation and rotation behavior

#### Scenario: Disallowed origin is blocked
- **WHEN** `POST /auth/refresh` includes `Origin` that is not in the configured refresh-origin allowlist
- **THEN** the API SHALL reject with canonical `403` ProblemDetails
- **AND** refresh-token state SHALL NOT be advanced

#### Scenario: Missing origin uses configurable mode
- **WHEN** `POST /auth/refresh` is called without `Origin` header
- **THEN** behavior SHALL follow configured `AUTH_REFRESH_MISSING_ORIGIN_MODE` (`deny` or `allow_trusted`)

#### Scenario: Existing invalid-cookie behavior remains unchanged
- **WHEN** refresh cookie is missing, malformed, unknown, or expired
- **THEN** the API SHALL continue returning canonical `401` ProblemDetails
