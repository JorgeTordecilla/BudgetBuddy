## ADDED Requirements

### Requirement: Canonical rate-limited ProblemDetails entry
The ProblemDetails catalog MUST include a canonical rate-limiting entry used by auth throttling responses.

#### Scenario: Catalog defines canonical 429 identity
- **WHEN** OpenAPI catalog entries are reviewed
- **THEN** the catalog SHALL define a canonical `429` entry with exact `type`, `title`, and `status` for rate-limited responses

#### Scenario: Runtime throttling uses canonical 429 values
- **WHEN** login or refresh requests are throttled by rate-limiter policy
- **THEN** response payloads SHALL use the exact canonical `type`, `title`, and `status` values defined in the catalog

### Requirement: Throttling error details are sanitized
Rate-limit error payloads MUST avoid leaking internal limiter implementation details.

#### Scenario: Rate-limit detail avoids internals
- **WHEN** a `429` ProblemDetails payload is returned
- **THEN** `detail` SHALL NOT expose cache keys, backend topology, or internal stack information

#### Scenario: Retry guidance remains client-safe
- **WHEN** throttled responses include retry guidance
- **THEN** guidance fields SHALL remain client-safe and SHALL NOT reveal sensitive server internals
