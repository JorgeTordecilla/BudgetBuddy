# backend-core-utils-organization Specification

## Purpose
TBD - created by archiving change reorganize-dependencies-utils-and-constants. Update Purpose after archive.
## Requirements
### Requirement: UTC Utility Is Exported From Core Utils
The backend MUST export `utcnow` from `backend/app/core/utils.py` and use that utility as the canonical source for current UTC timestamps.

#### Scenario: Dependencies module uses core utcnow
- **WHEN** `backend/app/dependencies.py` needs current UTC time
- **THEN** it imports `utcnow` from `app.core.utils`

#### Scenario: Auth router uses core utcnow
- **WHEN** `backend/app/routers/auth.py` needs current UTC time
- **THEN** it imports `utcnow` from `app.core.utils`

### Requirement: Body Methods Constant Is Centralized
The backend MUST define `BODY_METHODS` in `backend/app/core/constants.py` and reuse it from `dependencies.py`.

#### Scenario: Content-type enforcement reads shared BODY_METHODS
- **WHEN** `enforce_content_type` checks the request method
- **THEN** it evaluates membership using `BODY_METHODS` imported from `app.core.constants`

### Requirement: Refactor Preserves Behavior
Moving `utcnow` and `BODY_METHODS` MUST NOT alter runtime behavior.

#### Scenario: Existing auth and dependency behavior remains unchanged
- **WHEN** authentication and request header validation paths execute after refactor
- **THEN** responses and logic remain equivalent to prior behavior

