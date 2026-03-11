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
The auth router MUST import `as_utc()` from `app.core.utils` instead of defining a local `_as_utc()` helper, and refresh-critical auth code MUST use shared core time utilities for deterministic UTC behavior.

#### Scenario: Refresh expiration check uses shared helper
- **WHEN** refresh token expiration is evaluated in `backend/app/routers/auth.py`
- **THEN** the code uses `as_utc()` imported from `app.core.utils`

#### Scenario: Refresh flow obtains request snapshot from shared UTC utility
- **WHEN** `POST /auth/refresh` captures its request-time snapshot
- **THEN** the snapshot SHALL come from shared UTC utilities in `app.core.utils`
- **AND** direct ad-hoc clock sources SHALL NOT be used for refresh branch evaluation.

### Requirement: Refresh Repository Uses Shared UTC Clock Contract
Refresh-token repository write paths MUST use the shared UTC clock contract from core utilities for security-sensitive timestamps.

#### Scenario: Atomic rotate timestamps use shared UTC contract
- **WHEN** `rotate_atomically` writes `rotated_at` and `grace_until`
- **THEN** those timestamps SHALL be derived from the shared UTC clock contract
- **AND** repository logic SHALL NOT depend on uncoordinated direct clock calls.

#### Scenario: Shared clock contract is testable across router and repository
- **WHEN** tests override the shared UTC clock behavior
- **THEN** both router and repository refresh paths SHALL observe the same overridden time source
- **AND** temporal test assertions SHALL be deterministic.

### Requirement: Behavior Remains Unchanged
Moving `_as_utc()` to `core/utils.py` MUST NOT alter auth runtime behavior.

#### Scenario: Refresh token expiration semantics stay the same
- **WHEN** auth refresh expiration checks run after the refactor
- **THEN** valid and expired refresh tokens are handled the same as before
