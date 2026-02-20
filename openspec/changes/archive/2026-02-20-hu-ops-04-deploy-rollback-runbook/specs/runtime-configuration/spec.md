## MODIFIED Requirements

### Requirement: Deployment documentation reflects runtime config contract
Deployment documentation MUST list required variables and fail-fast rules.

#### Scenario: Deployment runbook includes prechecks and migration step
- **WHEN** operators prepare a production deployment
- **THEN** `DEPLOYMENT.md` SHALL include prechecks for required environment variables and DB connectivity
- **AND** deployment steps SHALL include `alembic upgrade head`

#### Scenario: Deployment runbook defines reproducible smoke test
- **WHEN** deployment is completed
- **THEN** `DEPLOYMENT.md` SHALL define a smoke-test sequence that validates auth login and authenticated `/me`
- **AND** the sequence SHALL be executable in approximately five minutes

#### Scenario: Deployment runbook defines rollback paths
- **WHEN** incidents require rollback
- **THEN** `DEPLOYMENT.md` SHALL define a reversible-migration rollback path using Alembic downgrade
- **AND** SHALL define an alternative backup/snapshot restore path for non-reversible migrations
