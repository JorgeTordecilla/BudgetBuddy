# backend-core-time-utils Specification

## Purpose
TBD - created by archiving change move-as-utc-to-core-utils. Update Purpose after archive.
## Requirements
### Requirement: UTC Normalization Helper Is Exposed From Core Utils
The backend MUST expose `as_utc()` from `backend/app/core/utils.py` for reusable UTC datetime normalization.

#### Scenario: Naive datetimes are normalized to UTC
- **WHEN** `as_utc()` receives a naive datetime
- **THEN** it returns an equivalent datetime with UTC tzinfo attached

#### Scenario: Aware datetimes are converted to UTC
- **WHEN** `as_utc()` receives a timezone-aware datetime
- **THEN** it returns the value converted to UTC

### Requirement: Auth Router Uses Shared UTC Normalization
The auth router MUST import `as_utc()` from `app.core.utils` instead of defining a local `_as_utc()` helper.

#### Scenario: Refresh expiration check uses shared helper
- **WHEN** refresh token expiration is evaluated in `backend/app/routers/auth.py`
- **THEN** the code uses `as_utc()` imported from `app.core.utils`

### Requirement: Behavior Remains Unchanged
Moving `_as_utc()` to `core/utils.py` MUST NOT alter auth runtime behavior.

#### Scenario: Refresh token expiration semantics stay the same
- **WHEN** auth refresh expiration checks run after the refactor
- **THEN** valid and expired refresh tokens are handled the same as before

