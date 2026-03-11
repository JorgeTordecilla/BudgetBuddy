## Purpose

Define minimum regression coverage expectations for critical backend security protections.

## Requirements

### Requirement: Critical backend security flows have regression coverage
The backend MUST maintain explicit regression coverage for the highest-risk auth and validation protections so future changes cannot silently weaken them.

#### Scenario: Refresh-token reuse audit path is covered
- **WHEN** a refresh token is reused after rotation
- **THEN** automated backend tests SHALL verify that the API records `auth.refresh_token_reuse_detected` in the authenticated user's audit history

#### Scenario: Login rate limit threshold is covered
- **WHEN** configured login threshold is exceeded within the active limiter window
- **THEN** automated backend tests SHALL verify that further login attempts are blocked with canonical `429` behavior

#### Scenario: Negative transaction amount is covered
- **WHEN** `POST /transactions` provides a negative `amount_cents`
- **THEN** automated backend tests SHALL verify that the write is rejected with canonical money-validation `400` behavior enforced by money-domain validation

#### Scenario: Invalid rollover month is covered
- **WHEN** rollover preview or apply receives an invalid month value
- **THEN** automated backend tests SHALL verify that the API returns canonical `400` ProblemDetails instead of framework-level or unhandled server errors

#### Scenario: Expired token unauthorized path is covered
- **WHEN** an expired refresh token is presented to the refresh flow
- **THEN** automated backend tests SHALL verify that the API returns canonical `401` ProblemDetails and not `500`

#### Scenario: Expired bearer token unauthorized path is covered
- **WHEN** an expired bearer access token is presented to a protected endpoint such as `GET /me`
- **THEN** automated backend tests SHALL verify that the API returns canonical `401` ProblemDetails and not `500`
